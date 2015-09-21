class AddRememberDigestToHubs < ActiveRecord::Migration
  def change
    add_column :hubs, :remember_digest, :string
  end
end
