#!/usr/local/bin/ruby
require 'em-websocket'
require 'rails'
require 'json'
require 'erb'
require 'geoip'
require 'logger'
include ERB::Util

load '/home/ubuntu/node-https/config.rb'

log = Logger.new("#{LOGFILE}")

wssCfg = {
  :host => "0.0.0.0",
  :port => 55555,
  :secure => true,
  :tls_options => {
    :private_key_file => "#{PRIVATEKEY}",
    :cert_chain_file => "#{CERTIFICATE}"
  }
};

geoip = GeoIP.new("#{GEOFILE}")

class EventMachine::WebSocket::Connection
  def ip
    get_peername[2,6].unpack('nC4')[1..4].join('.')
  end

  def ip16
    "%02X%02X%02X%02X" % get_peername[2,6].unpack('nC4')[1..4]
  end

  def port
    get_peername[2,2].unpack('nH')[0]
  end

  def port16
    "%04X" % get_peername[2,2].unpack('nH')[0]
  end
end

EventMachine.run {
  @peers = Array.new
  @act_peers = 0
  if ARGV[0]
    wssCfg[:port] = ARGV[0]
  end
  puts "msg_srouter starting"
  log.info "#{wssCfg}"
    
  EventMachine::WebSocket.start(wssCfg) do |ws|
    ws.onopen do 
      begin
        # log.info "#{ws.ip}:#{ws.port} connected!"
      rescue StandardError => e
        log.error "Error: #{e.backtrace}"
      end
    end

    ws.onclose do
      begin
        c = @peers.find{|p| p[:socket] == ws}
        if (c)
          msg = {:hub => c[:hub], :type => "bye", :from => c[:conn]}.to_json
          @peers.delete(c)
          @peers.each do |p| 
            if (p[:socket] !=ws && p[:hub] == c[:hub])  
              p[:socket].send(msg) 
            end
          end
          @act_peers -= 1
          log.info "(#{c[:conn]})}: #{c[:peer]}@#{c[:hub]} deregistered (#{@act_peers})"
        end
      rescue StandardError => e
        log.error "Error: #{e.message}"
        log.error "Trace: #{e.backtrace}"
      end
    end

    ws.onerror do |err|
      log.error "WS_ERROR! #{err.message}"
    end
    
    ws.onmessage do |pmsg|
      if (pmsg.length > 0)  
        begin
          msg = JSON.parse(pmsg).symbolize_keys
          if (msg[:type] == 'hi') 
            conn = "#{ws.ip16}#{ws.port16}"
            p = @peers.find{|p| p[:socket] == ws}
            if (p)  
              @peers.delete(p)
              @act_peers -= 1
            end
            @loc = geoip.city("#{ws.ip}")
            @peers.push({:hub=>msg[:hub], :conn=>conn, :peer=>msg[:data]['peer'], :socket=>ws, :city=>@loc.city_name, :country=>@loc.country_name})
            syncmsg = msg.clone
            syncmsg[:data][:result] = "Success"
            syncmsg[:type] = "ho"
            syncmsg[:from] = msg[:from] = conn
            syncmsg[:ts] = (Time.now.getutc.to_f * 1000).to_i
            ws.send(syncmsg.to_json)
            @act_peers += 1
            log.info "(#{conn}): #{msg[:data]['peer']}@#{msg[:hub]} from #{@loc.city_name}, #{@loc.country_name} registered (#{@act_peers})"
          elsif (msg[:type] == 'bye') 
            p = @peers.find{|p| p[:socket] == ws}
            if (p)  
              @act_peers -= 1
              log.info "(#{p[:conn]})}: #{p[:peer]}@#{p[:hub]} deregistered (#{@act_peers})"
              @peers.delete(p)
            end            
          elsif (msg[:type] == 'query') 
            syncmsg = msg.clone
            syncmsg[:type] = "reply"
            p = @peers.find{|p| p[:hub] == msg[:data]['hub']}
            if (p)  
              syncmsg[:data][:reply] = 'true'
            else
              syncmsg[:data][:reply] = 'false'              
            end
            ws.send(syncmsg.to_json)
            log.info "(#{msg[:from]} queried existence of Hub:#{msg[:data]['hub']}"            
          end

          if (msg[:type] != "beacon" && msg[:type] != "query") 
            if (msg.key?(:to)) 
              # Unicast
              p = @peers.find{|p| p[:conn] == msg[:to]}
              if (p)  
                p[:socket].send(msg.to_json)
              end
            else
              # Broadcast
              @peers.each do |p| 
                if (p[:socket] != ws && p[:hub] == msg[:hub])  
                  p[:socket].send(msg.to_json) 
                end
              end
            end
          end 
        rescue StandardError => e
          log.error "Error: #{e.message}"
          log.error "Trace: #{e.backtrace}"
        end
      end
    end
  end
}
