# frozen_string_literal: true

require "cgi"

module NetlifyImageCdn
  module_function

  IMAGE_EXTENSIONS = %w[jpg jpeg png webp avif].freeze

  def enabled?
    ENV["JEKYLL_ENV"] == "production"
  end

  def transformable_src?(src)
    return false unless src&.start_with?("/assets/images/")
    return false if src.start_with?("/.netlify/images?")

    ext = src.split("?").first.to_s.split(".").last.to_s.downcase
    IMAGE_EXTENSIONS.include?(ext)
  end

  def transformed_url(src)
    "/.netlify/images?url=#{CGI.escape(src)}&q=70"
  end

  def rewrite_images(html)
    return html unless enabled?

    html.gsub(/<img\b[^>]*>/i) do |tag|
      src_match = tag.match(/\bsrc=(["'])([^"']+)\1/i)
      next tag unless src_match

      src = src_match[2]
      next tag unless transformable_src?(src)

      new_src = transformed_url(src)
      updated = tag.sub(src_match[0], %(src="#{new_src}"))
      unless updated.match?(/\bdata-original-src=/i)
        updated = updated.sub("<img", %(<img data-original-src="#{src}"))
      end
      updated
    end
  end
end

Jekyll::Hooks.register :documents, :post_render do |document|
  document.output = NetlifyImageCdn.rewrite_images(document.output)
end

Jekyll::Hooks.register :pages, :post_render do |page|
  page.output = NetlifyImageCdn.rewrite_images(page.output)
end
