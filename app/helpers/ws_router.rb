#!/usr/local/bin/ruby
require 'em-websocket'
require 'rails'
require 'json'
require 'erb'
include ERB::Util

EventMachine.run {
  @peers = Array.new
  @act_peers = 0
    
  EventMachine::WebSocket.start(:host => '0.0.0.0', :port => '55688') do |ws|
    ws.onopen do
	  begin
        @act_peers += 1
	  rescue StandardError => e
	    puts "Error: #{e.message}"
	  end
    end

    ws.onclose do
	  @act_peers -= 1
      begin
        p = @peers.find{|p| p[:socket] == ws}
		msg = {:hub => p[:hub], :peer => p[:peer], :action => "bye"}.to_json
        @peers.delete(p)
        @peers.each do |p| 
      	  if (p[:hub] == p[:hub]) then 
      	    p[:socket].send(msg) 
          end
        end
        puts "#{p[:peer]} has left Hub:#{p[:hub]}(#{@act_peers})"
	  rescue StandardError => e
	    puts "Error: #{e.message}"
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
		    @peers.push({:hub=>msg[:hub], :peer=>msg[:peer], :socket=>ws})
		    puts "#{msg[:peer]} has entered Hub:#{msg[:hub]}(#{@act_peers})"
		  end	
          if (msg.key?(:dst)) then
            # Unicast
            p = @peers.find{|p| p[:peer] == msg[:dst]}
            p[:socket].send(pmsg)
          else
            # Broadcast
            @peers.each do |p| 
	          if (p[:socket] !=ws && p[:hub] == msg[:hub]) then 
	            p[:socket].send(pmsg) 
	          end
            end
          end
        rescue StandardError => e
          puts "Error: #{e.message}"
	      puts "Peer Msg: #{pmsg}"
        end
      end
    end
  end
}
