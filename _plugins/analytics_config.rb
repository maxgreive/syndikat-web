# frozen_string_literal: true

module AnalyticsConfig
  module_function

  def enabled?
    ENV["ENABLE_ANALYTICS"] == "true" || ENV["CONTEXT"] == "production"
  end
end

Jekyll::Hooks.register :site, :after_init do |site|
  site.config["analytics_enabled"] = AnalyticsConfig.enabled?
end
