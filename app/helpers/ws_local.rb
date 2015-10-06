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
      index = @sockets.index {|i| i[:socket] == ws}
      client = @sockets.delete_at index
      @sockets.each {|s| s[:socket].send h("#{client[:id]} has disconnected!")}
    end
    
    ws.onmessage do |msg|
      begin
        client = JSON.parse(msg).symbolize_keys
        case client[:action]
          when 'connect'
            @sockets.push({:id=>client[:id], :socket=>ws})
            @sockets.each {|s| s[:socket].send h("#{client[:id]} has connected!")}
          when 'say'
            @sockets.each {|s| s[:socket].send h("#{client[:id]} says : #{client[:data]}")}
          when 'path'
            @sockets.each {|s| s[:socket].send msg}
          end
      rescue
        # do nothing
      end
    end
  end
}
