#!/usr/local/bin/ruby
require 'em-websocket'
require 'rails'
require 'json'
require 'erb'
include ERB::Util

class EventMachine::WebSocket::Connection
  def remote_addr
    get_peername[2,6].unpack('nC4')[1..4].join('.')
  end

  def remote_port
    get_peername[2,2].unpack('nH')[0]
  end
end

EventMachine.run {
  @peers = Array.new
  @act_peers = 0
  @host = '0.0.0.0'
  @port = '55688'
  if ARGV[0]
    @port = ARGV[0]
  end
    
  EventMachine::WebSocket.start(:host => @host, :port => @port) do |ws|
    ws.onopen do 
  	  begin
        # puts "#{ws.remote_addr}:#{ws.remote_port} connected!"
  	  rescue StandardError => e
  	    puts "Error: #{e.backtrace}"
  	  end
    end

    ws.onclose do
      begin
        c = @peers.find{|p| p[:socket] == ws}
        if (c)
  		    msg = {:hub => c[:hub], :type => "bye", :from => c[:peer]}.to_json
          @peers.delete(c)
          @peers.each do |p| 
        	  if (p[:socket] !=ws && p[:hub] == c[:hub])  
        	    p[:socket].send(msg) 
            end
          end
          @act_peers -= 1
          puts "#{Time.now} / (#{c[:peer]})} @ #{c[:hub]} deregistered (#{@act_peers})"
        end
  	  rescue StandardError => e
        puts "Error: #{e.message}"
        puts "Trace: #{e.backtrace}"
  	  end
    end

    ws.onerror do |err|
      puts "WS_ERROR! #{err.message}"
    end
    
    ws.onmessage do |pmsg|
      if (pmsg.length > 0)  
        begin
          msg = JSON.parse(pmsg).symbolize_keys
    		  if (msg[:type] == 'hi') 
            peer = "#{ws.remote_addr}:#{ws.remote_port}"
            p = @peers.find{|p| p[:peer] == peer}
            if (p)  
      			  @peers.delete(p)
              @act_peers -= 1
      			end
    		    @peers.push({:hub=>msg[:hub],  :peer=>peer, :socket=>ws})
      			syncmsg = msg.clone
            syncmsg[:data][:result] = "Success"
            syncmsg[:type] = "ho"
            syncmsg[:from] = msg[:from] = peer
            syncmsg[:ts] = (Time.now.getutc.to_f * 1000).to_i
            ws.send(syncmsg.to_json)
            @act_peers += 1
    		    puts "#{Time.now} / (#{peer}) @ #{msg[:hub]} registered (#{@act_peers})"
          elsif (msg[:type] == 'bye') 
            p = @peers.find{|p| p[:peer] == msg[:from]}
            if (p)  
              @act_peers -= 1
              puts "#{Time.now} / (#{p[:peer]})} @ #{p[:hub]} deregistered (#{@act_peers})"
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
            puts "#{Time.now} / (#{msg[:from]} queried existence of Hub:#{msg[:data]['hub']}"            
          end

          if (msg[:type] != "ping" && msg[:type] != "query") 
            if (msg.key?(:to)) 
              # Unicast
              p = @peers.find{|p| p[:peer] == msg[:to]}
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
          puts "Error: #{e.message}"
          puts "Trace: #{e.backtrace}"
        end
      end
    end
  end
}
