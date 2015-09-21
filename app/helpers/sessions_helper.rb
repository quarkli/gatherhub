module SessionsHelper
  def log_in(hub)
    session[:user_id] = hub.id
  end

  def current_hub
    if (user_id = session[:user_id])
      @current_hub ||= Hub.find_by(id: user_id)
    end  
  end  

  def logged_in?
    !current_hub.nil?
  end

  def log_out
    session.delete(:user_id)
    @current_user = nil
  end
  
end
