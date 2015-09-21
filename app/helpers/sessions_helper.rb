module SessionsHelper
  def log_in(hub)
    session[:user_id] = hub.id
  end

  def current_hub
    if (user_id = session[:user_id])
      @current_hub ||= Hub.find_by(id: user_id)
    elsif (user_id = cookies.signed[:user_id])
      hub = Hub.find_by(id: user_id)
      if hub && hub.authenticated?(cookies[:remember_token])
        log_in hub
        @current_hub = hub
      end  
    end  
  end  

  def logged_in?
    !current_hub.nil?
  end

  def log_out
    forget(current_hub)
    session.delete(:user_id)
    @current_user = nil
  end
  
  def remember(hub)
      hub.remember
      cookies.permanent.signed[:user_id] = hub.id
      cookies.permanent[:remember_token] = hub.remember_token
  end
  
  def forget(hub)
    hub.forget
    cookies.delete(:user_id)
    cookies.delete(:remember_token)
  end  
  
end
