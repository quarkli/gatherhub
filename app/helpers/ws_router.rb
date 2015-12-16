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
end

EventMachine.run {
  @peers = Array.new
  @act_peers = 0
    
  EventMachine::WebSocket.start(:host => '0.0.0.0', :port => '55688') do |ws|
    ws.onopen do 
	  begin
        @act_peers += 1
	  rescue StandardError => e
	    puts "Error: #{e.backtrace}"
	  end
    end

    ws.onclose do
	  @act_peers -= 1
      begin
        c = @peers.find{|p| p[:socket] == ws}
		msg = {:hub => c[:hub], :peer => c[:peer], :name => c[:name], :action => "bye"}.to_json
        @peers.delete(c)
        @peers.each do |p| 
      	  if (p[:socket] !=ws && p[:hub] == c[:hub]) then 
      	    p[:socket].send(msg) 
          end
        end
        puts "#{Time.now} / (#{c[:ip]}): #{c[:name]} has left Hub:#{c[:hub]}(#{@act_peers})"
	  rescue StandardError => e
          puts "Error: #{e.message}"
          puts "Trace: #{e.backtrace}"
	  end
    end
    
    ws.onmessage do |pmsg|
	  if (pmsg.length > 0) then 
        begin
          msg = JSON.parse(pmsg).symbolize_keys
		  if (msg[:action] == 'hello') then
            p = @peers.find{|p| p[:socket] == ws}
            if (p)  then
			  @peers.delete(p)
			end
		    @peers.push({:hub=>msg[:hub], :peer=>msg[:peer], :socket=>ws, :ip=>ws.remote_addr, :name=>msg[:data]['name']})
			syncmsg = msg.clone
			syncmsg[:action] = "sync"
		    syncmsg[:data][:ts] = Time.now.getutc.to_i
			ws.send(syncmsg.to_json)
		    puts "#{Time.now} / (#{ws.remote_addr}): #{msg[:data]['name']} has entered Hub:#{msg[:hub]}(#{@act_peers})"
		  end	
          if (msg.key?(:dst)) then
            # Unicast
            p = @peers.find{|p| p[:peer] == msg[:dst]}
			if (p)  then
				p[:socket].send(msg.to_json)
			end
          else
            # Broadcast
            @peers.each do |p| 
	          if (p[:socket] !=ws && p[:hub] == msg[:hub]) then 
	            p[:socket].send(msg.to_json) 
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
