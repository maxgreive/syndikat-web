export default {
  eleventyComputed: {
    author: data => data.people[data.author_id],
    postsByAuthor: data => data.collections.posts.filter(post =>
      post.data.author === data.author_id || post.data.authors?.includes(data.author_id)
    ),
    title: data => `${data.people[data.author_id].name} beim Disc Golf Syndikat`,
  },
};
