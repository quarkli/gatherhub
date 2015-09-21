module ApplicationHelper
  def full_title(page_title='')
    base_title = "GatherHub"
    if page_title.empty?
      base_title
    else
      "#{page_title} | #{base_title}"
    end
  end

  # def log_in(hub)
  #   session[:user_id] = hub.id
  # end
  
end
