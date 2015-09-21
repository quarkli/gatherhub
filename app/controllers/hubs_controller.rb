class HubsController < ApplicationController
  def new
    @hub = Hub.new
  end
  
  def create
  end

  def show
    @hub = Hub.find(params[:id])
    #debugger
  end

  def create
    @hub = Hub.new(hub_params) 
    if @hub.save
      log_in @hub
      flash[:success] = "Welcome to the Your Hub!"
      #redirect_to @hub
      redirect_to hub_url(@hub)
    else
    render 'new'
    end
  end


private

  def hub_params
    params.require(:hub).permit(:name, :email, :password)
  end  
end
