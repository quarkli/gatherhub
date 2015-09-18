class AddPasswordDigestToHubs < ActiveRecord::Migration
  def change
    add_column :hubs, :password_digest, :string
  end
end
