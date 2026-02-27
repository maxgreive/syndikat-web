# frozen_string_literal: true

require "cgi"

module NetlifyImageCdn
  module_function

  IMAGE_EXTENSIONS = %w[jpg jpeg png webp avif].freeze
  ARTICLE_WIDTHS = [480, 760, 960, 1200, 1600].freeze
  ARTICLE_SIZES = "(min-width: 792px) 760px, calc(100vw - 40px)"

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

  def transformed_srcset(src)
    ARTICLE_WIDTHS.map do |width|
      "#{transformed_url(src)}&w=#{width} #{width}w"
    end.join(", ")
  end

  def ensure_attribute(tag, name, value)
    return tag if tag.match?(/\b#{Regexp.escape(name)}=/i)

    tag.sub("<img", %(<img #{name}="#{value}"))
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
      updated = ensure_attribute(updated, "data-original-src", src)
      updated = ensure_attribute(updated, "srcset", transformed_srcset(src))
      updated = ensure_attribute(updated, "sizes", ARTICLE_SIZES)
      updated = ensure_attribute(updated, "loading", "lazy")
      updated = ensure_attribute(updated, "decoding", "async")
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
