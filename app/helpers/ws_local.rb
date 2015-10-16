#!/usr/local/bin/ruby
require 'em-websocket'
require 'rails'
require 'json'
require 'erb'
include ERB::Util

EventMachine.run {
  @sockets = Array.new
    
  EventMachine::WebSocket.start(:host => '0.0.0.0', :port => '55688') do |ws|
    ws.onopen do
    end

    ws.onclose do
	  peers = 0
      index = @sockets.index {|i| i[:socket] == ws}
	  if (index > 0) then
        client = @sockets.delete_at index
        reply = "Peer:#{client[:name]} has left Hub:#{client[:id]}"
        @sockets.each do |s| 
      	  if (s[:id] == client[:id]) then 
      	    s[:socket].send(h(reply)) 
            peers += 1
          end
        end
        puts "#{reply}(#{peers})"
	  end
    end
    
    ws.onmessage do |msg|
      begin
        client = JSON.parse(msg).symbolize_keys
        case client[:action]
          when 'connect'
		    peers = 0
		    reply = "#{client[:name]} has entered Hub:#{client[:id]}"
            @sockets.push({:id=>client[:id], :name=>client[:name], :socket=>ws})
            @sockets.each do |s| 
			  if (s[:id] == client[:id]) then 
			    s[:socket].send(h(reply))
				peers += 1
			  end
			end
			puts "#{reply}(#{peers})"
          when 'say'
            @sockets.each do |s| 
			  if (s[:id] == client[:id]) then 
			    s[:socket].send(h("#{client[:name]} says : #{client[:data]}")) 
			  end
			end
			puts "#{client[:name]} says : #{client[:data]}"
          when 'path'
            @sockets.each do |s| 
			  if (s[:id] == client[:id]) then 
			    s[:socket].send(msg) 
			  end
			end
          end
      rescue JSON::ParserError => e
        #puts "JSON Parse Error: #{e.message}"
      end
    end
  end
}
