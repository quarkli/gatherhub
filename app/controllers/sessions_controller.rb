class SessionsController < ApplicationController
  def new
  end

  def create
    hub = Hub.find_by(id: params[:session][:id].downcase)
    if hub && hub.authenticate(params[:session][:password])
      #hub login and redirect to hub page
      log_in hub
      # params[:session][:remember_me] == '1' ? remember(hub) : forget(hub)
      # remember hub
      redirect_to hub
    else
      # generate an error message
      flash.now[:danger] = 'Invalid email/password combination'
      render 'new'
    end
  end

  def destroy
    log_out if logged_in?
    redirect_to root_url
  end


end
