class HubsController < ApplicationController
  def new
    @hub = Hub.new
  end
end
