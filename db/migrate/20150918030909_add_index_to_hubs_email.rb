class AddIndexToHubsEmail < ActiveRecord::Migration
  def change
    add_index :hubs, :email, unique: true
  end
end
