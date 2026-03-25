'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Calendar, Clock, ArrowRight, User } from 'lucide-react';
import Link from 'next/link';

const blogPosts = [
  {
    id: 1,
    title: 'The Future of Electronic Music',
    excerpt: 'Discover how AI and technology are reshaping the electronic music landscape in 2025.',
    image: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&q=80&w=1200',
    date: 'Mar 12, 2025',
    readTime: '5 min read',
    author: 'Alex Chen',
    category: 'Industry'
  },
  {
    id: 2,
    title: 'Behind the Scenes: Festival Planning',
    excerpt: 'What it takes to organize a world-class music festival from the ground up.',
    image: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97d890?auto=format&fit=crop&q=80&w=1200',
    date: 'Mar 10, 2025',
    readTime: '8 min read',
    author: 'Sarah Kim',
    category: 'Events'
  },
  {
    id: 3,
    title: 'Rising Stars: Artists to Watch',
    excerpt: 'Meet the underground DJs and producers who are breaking into the mainstream.',
    image: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=1200',
    date: 'Mar 8, 2025',
    readTime: '6 min read',
    author: 'Mike Ross',
    category: 'Artists'
  },
  {
    id: 4,
    title: 'Sound Design Secrets',
    excerpt: 'Professional techniques for creating unique and memorable electronic sounds.',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1200',
    date: 'Mar 5, 2025',
    readTime: '10 min read',
    author: 'David Park',
    category: 'Production'
  },
  {
    id: 5,
    title: 'Venue Spotlight: Underground Clubs',
    excerpt: 'Exploring the hidden gems that keep electronic music culture alive.',
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=1200',
    date: 'Mar 2, 2025',
    readTime: '7 min read',
    author: 'Lisa Wong',
    category: 'Venues'
  }
];

export default function BlogPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  // Parallax transforms for hero section
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.9]);

  // Background parallax layers
  const bgY1 = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const bgY2 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const bgY3 = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div ref={containerRef} className="min-h-screen bg-black">
      {/* Parallax Background Layers */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          style={{ y: bgY1 }}
          className="absolute -top-20 -left-40 w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-3xl"
        />
        <motion.div 
          style={{ y: bgY2 }}
          className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-white/[0.03] blur-3xl"
        />
        <motion.div 
          style={{ y: bgY3 }}
          className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-white/[0.02] blur-3xl"
        />
      </div>

      {/* Hero Section with Parallax */}
      <motion.section 
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="relative h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Hero Background Image with Parallax */}
        <motion.div 
          style={{ y: useTransform(scrollYProgress, [0, 0.5], [0, 200]) }}
          className="absolute inset-0"
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=1920)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
        </motion.div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block px-4 py-1.5 mb-6 text-sm font-medium tracking-wider text-white/70 border border-white/20 rounded-full backdrop-blur-sm"
          >
            STORIES & INSIGHTS
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-6"
          >
            THE BLOG
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto"
          >
            Explore the latest news, artist spotlights, and behind-the-scenes stories from the world of electronic music
          </motion.p>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-1"
          >
            <motion.div className="w-1.5 h-1.5 bg-white rounded-full" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Blog Posts Grid with Parallax Cards */}
      <section className="relative z-10 px-4 py-20 md:py-32">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4">LATEST STORIES</h2>
            <div className="w-20 h-0.5 bg-white/20" />
          </motion.div>

          {/* Featured Post (Large) */}
          <motion.article
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <Link href={`/blog/${blogPosts[0].id}`} className="group block">
              <div className="relative aspect-[21/9] rounded-2xl overflow-hidden">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0"
                >
                  <img 
                    src={blogPosts[0].image} 
                    alt={blogPosts[0].title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
                  <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-wider text-white bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    {blogPosts[0].category}
                  </span>
                  <h3 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-3 group-hover:text-white/80 transition-colors">
                    {blogPosts[0].title}
                  </h3>
                  <p className="text-white/60 text-base md:text-lg max-w-2xl mb-4">
                    {blogPosts[0].excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-white/40">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {blogPosts[0].date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {blogPosts[0].readTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      {blogPosts[0].author}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.article>

          {/* Posts Grid */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {blogPosts.slice(1).map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Link href={`/blog/${post.id}`} className="group block">
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0"
                    >
                      <img 
                        src={post.image} 
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2.5 py-0.5 text-xs font-bold tracking-wider text-white/70 bg-white/5 rounded-full border border-white/10">
                      {post.category}
                    </span>
                    <span className="text-xs text-white/40">{post.date}</span>
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-2 group-hover:text-white/80 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-white/50 text-sm md:text-base mb-3 line-clamp-2">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {post.readTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {post.author}
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>

          {/* Load More Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 text-center"
          >
            <button className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-white font-medium transition-all group">
              Load More Articles
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Section with Parallax */}
      <motion.section
        style={{ y: useTransform(scrollYProgress, [0.5, 1], [100, -50]) }}
        className="relative z-10 py-20 md:py-32"
      >
        <div className="max-w-4xl mx-auto px-4">
          <div 
            className="rounded-3xl p-8 md:p-16 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4"
            >
              STAY IN THE LOOP
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-white/50 text-lg mb-8 max-w-lg mx-auto"
            >
              Subscribe to our newsletter for the latest stories, event updates, and exclusive content
            </motion.p>
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <input 
                type="email" 
                placeholder="Enter your email"
                className="flex-1 px-5 py-3.5 bg-black/50 border border-white/10 rounded-full text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
              <button className="px-6 py-3.5 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-colors">
                Subscribe
              </button>
            </motion.form>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
