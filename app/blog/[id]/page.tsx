'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Calendar, Clock, User, ArrowLeft, Share2, Bookmark, Heart } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const blogPosts = [
  {
    id: 1,
    title: 'The Future of Electronic Music',
    excerpt: 'Discover how AI and technology are reshaping the electronic music landscape in 2025.',
    content: `
      <p>Electronic music has always been at the forefront of technological innovation. From the early synthesizers of the 1960s to today's AI-powered production tools, the genre has consistently pushed the boundaries of what's possible in sound creation.</p>
      
      <p>In 2025, we're witnessing another paradigm shift. Machine learning algorithms are now capable of generating complex drum patterns, crafting unique synth sounds, and even composing entire tracks. But this raises an important question: where does human creativity fit in this new landscape?</p>
      
      <h2>The Rise of AI Collaboration</h2>
      
      <p>Rather than replacing human artists, AI is increasingly being used as a collaborative tool. Producers are using AI to overcome creative blocks, generate new ideas, and explore sonic territories that would be impossible to reach through traditional means.</p>
      
      <p>Tools like neural audio synthesis and generative composition assistants are becoming standard in professional studios. These aren't replacing the artist's vision—they're amplifying it.</p>
      
      <h2>Immersive Live Experiences</h2>
      
      <p>Technology is also transforming the live music experience. Spatial audio, mixed reality, and real-time generative visuals are creating shows that blur the line between concert and interactive art installation.</p>
      
      <p>Festivals are investing heavily in these technologies, with some events featuring fully immersive 360-degree audio environments and AI-responsive visual systems that adapt to the music in real-time.</p>
      
      <h2>The Future is Hybrid</h2>
      
      <p>As we look ahead, the most exciting developments come from the intersection of human creativity and technological capability. The artists who will define the next era of electronic music are those who can harness these tools while maintaining their unique creative voice.</p>
      
      <p>The future isn't about AI versus human—it's about finding new ways to express ourselves through sound, using every tool available to bring our artistic visions to life.</p>
    `,
    image: 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?auto=format&fit=crop&q=80&w=1200',
    date: 'Mar 12, 2025',
    readTime: '5 min read',
    author: 'Alex Chen',
    authorRole: 'Music Technology Editor',
    category: 'Industry'
  },
  {
    id: 2,
    title: 'Behind the Scenes: Festival Planning',
    excerpt: 'What it takes to organize a world-class music festival from the ground up.',
    content: `
      <p>Organizing a major music festival is one of the most complex logistical challenges in the entertainment industry. Behind the magical moments fans experience lies months of meticulous planning, countless challenges, and a team of dedicated professionals working around the clock.</p>
      
      <h2>The Planning Begins Early</h2>
      
      <p>For most major festivals, planning begins 12-18 months before the event. This includes securing the venue, obtaining permits, building the infrastructure, and—most importantly—curating the lineup that will define the festival's identity.</p>
      
      <p>"The lineup is everything," says festival director Maria Santos. "It's not just about booking big names. It's about creating a journey for the attendees, programming stages that flow well together, and discovering the next breakout artists."</p>
      
      <h2>Logistical Challenges</h2>
      
      <p>A typical major festival requires coordinating thousands of people: artists, crew, security, medical staff, vendors, and volunteers. The infrastructure includes multiple stages, sound systems, lighting rigs, power generators, water stations, medical facilities, and food vendors.</p>
      
      <p>Weather is always a wildcard. Festival organizers must have contingency plans for everything from light rain to severe storms. Some festivals have invested in covered stages and weather-resistant infrastructure that can handle almost anything nature throws at them.</p>
      
      <h2>The Economic Impact</h2>
      
      <p>Beyond the entertainment value, major festivals bring significant economic benefits to their host cities. Hotels, restaurants, transportation services, and local businesses all see substantial boosts during festival weekends.</p>
      
      <p>As festival culture continues to grow globally, the industry is evolving to meet new challenges while continuing to deliver unforgettable experiences for millions of music fans each year.</p>
    `,
    image: 'https://images.unsplash.com/photo-1533174072545-e8d4aa97d890?auto=format&fit=crop&q=80&w=1200',
    date: 'Mar 10, 2025',
    readTime: '8 min read',
    author: 'Sarah Kim',
    authorRole: 'Events Correspondent',
    category: 'Events'
  },
  {
    id: 3,
    title: 'Rising Stars: Artists to Watch',
    excerpt: 'Meet the underground DJs and producers who are breaking into the mainstream.',
    content: `
      <p>The electronic music scene is constantly evolving, with fresh talent emerging from bedrooms and underground clubs around the world. Today we're spotlighting three artists who are making waves and reshaping the sound of tomorrow.</p>
      
      <h2>Luna Wave</h2>
      
      <p>Hailing from Berlin's vibrant techno scene, Luna Wave has been turning heads with her hypnotic blend of atmospheric textures and driving rhythms. Her recent EP "Midnight Synthesis" caught the attention of major labels and established DJs alike.</p>
      
      <p>"I started producing in my bedroom during lockdown," Luna explains. "I had no idea anyone would actually listen to my music. Now I'm playing shows across Europe. It's surreal."</p>
      
      <h2>Kairos</h2>
      
      <p>From the UK's bass music underground comes Kairos, a producer who's bridging the gap between dubstep, garage, and techno. His innovative sound design and meticulous attention to detail have earned him a dedicated following.</p>
      
      <p>Kairos represents a new generation of producers who aren't constrained by genre boundaries. His tracks might start with a garage rhythm, drop into a half-time bass section, and resolve into melodic techno—all seamlessly woven together.</p>
      
      <h2>Solaris Collective</h2>
      
      <p>This Montreal-based group is bringing live instrumentation back to electronic music. With a setup that includes synthesizers, drum machines, and live bass and guitar, their performances blur the line between DJ set and live band.</p>
      
      <p>Their approach resonates with audiences hungry for something beyond the standard laptop-and-controller setup. Each show is unique, with improvisation and live elements creating one-of-a-kind experiences.</p>
    `,
    image: 'https://images.unsplash.com/photo-1514525253440-b393452e3726?auto=format&fit=crop&q=80&w=1200',
    date: 'Mar 8, 2025',
    readTime: '6 min read',
    author: 'Mike Ross',
    authorRole: 'Music Critic',
    category: 'Artists'
  },
  {
    id: 4,
    title: 'Sound Design Secrets',
    excerpt: 'Professional techniques for creating unique and memorable electronic sounds.',
    content: `
      <p>Great sound design is the foundation of memorable electronic music. Whether you're crafting a lead synth, designing a kick drum, or creating atmospheric textures, understanding the principles of sound design can elevate your productions to professional levels.</p>
      
      <h2>Start with the Source</h2>
      
      <p>The best sound design starts with the right source material. This might mean choosing the right oscillator waveform, sampling the right acoustic sound, or using the right synthesis method for your desired result.</p>
      
      <p>"I spend a lot of time just experimenting with raw waveforms," says producer David Park. "A simple saw wave through the right filter and effects chain can become something completely unique."</p>
      
      <h2>Modulation is Key</h2>
      
      <p>Static sounds are boring. The magic happens when you introduce movement through modulation. LFOs, envelope generators, and step sequencers can all be used to create evolving, organic sounds that capture the listener's attention.</p>
      
      <p>Don't be afraid to modulate unexpected parameters. Modulating filter cutoff is standard, but what about modulating the sample rate of a bit crusher? Or the stereo width? Or the resonance of a filter in sync with the tempo?</p>
      
      <h2>Layering for Depth</h2>
      
      <p>Most professional sounds are actually multiple layers working together. A powerful lead might combine a bright top layer, a warm mid layer, and a sub layer that only handles the lowest frequencies.</p>
      
      <p>The art is in making these layers feel like one cohesive sound. This requires careful EQ, compression, and sometimes mid-side processing to ensure each layer occupies its own space while contributing to the whole.</p>
    `,
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=1200',
    date: 'Mar 5, 2025',
    readTime: '10 min read',
    author: 'David Park',
    authorRole: 'Sound Designer',
    category: 'Production'
  },
  {
    id: 5,
    title: 'Venue Spotlight: Underground Clubs',
    excerpt: 'Exploring the hidden gems that keep electronic music culture alive.',
    content: `
      <p>While massive festivals and superclubs dominate headlines, the heart of electronic music culture beats in small, underground venues. These intimate spaces are where new sounds are tested, communities are built, and the culture stays authentic.</p>
      
      <h2>The Importance of Intimacy</h2>
      
      <p>There's something magical about a crowded room where the DJ is just meters away from the dance floor. The energy flows differently in small spaces—it's more concentrated, more intense, and more connected.</p>
      
      <p>"In a small club, you can see every face on the dance floor," explains resident DJ Carlos Martinez. "You can feel the energy shift and respond to it in real-time. That's impossible in a huge venue."</p>
      
      <h2>Worldwide Underground</h2>
      
      <p>From Tokyo's tiny basement venues to Berlin's raw warehouse spaces, underground clubs share a common ethos: music first, everything else second. The decor might be minimal, the sound system might be homemade, but the focus on the music is absolute.</p>
      
      <p>These venues often operate on the fringes of legality, existing in spaces that aren't officially zoned for clubs. This underground status creates a sense of community and shared secret among attendees.</p>
      
      <h2>Nurturing New Talent</h2>
      
      <p>Underground clubs are essential for developing new artists. They provide a space for experimental sounds that might not work in mainstream venues. Many of today's biggest names got their start playing to small crowds in these intimate spaces.</p>
      
      <p>The culture of the underground ensures that electronic music will continue to evolve and surprise us, regardless of what happens in the commercial mainstream.</p>
    `,
    image: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=1200',
    date: 'Mar 2, 2025',
    readTime: '7 min read',
    author: 'Lisa Wong',
    authorRole: 'Culture Writer',
    category: 'Venues'
  }
];

interface BlogPostPageProps {
  params: {
    id: string;
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const postId = parseInt(params.id);
  const post = blogPosts.find(p => p.id === postId);

  if (!post) {
    notFound();
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  // Parallax transforms
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 200]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  // Background layers
  const bgY1 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const bgY2 = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div ref={containerRef} className="min-h-screen bg-black">
      {/* Parallax Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          style={{ y: bgY1 }}
          className="absolute top-20 -left-20 w-[400px] h-[400px] rounded-full bg-white/[0.02] blur-3xl"
        />
        <motion.div 
          style={{ y: bgY2 }}
          className="absolute bottom-40 -right-20 w-[300px] h-[300px] rounded-full bg-white/[0.03] blur-3xl"
        />
      </div>

      {/* Hero Section with Parallax */}
      <motion.section 
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="relative h-[70vh] flex items-end overflow-hidden"
      >
        <motion.div 
          style={{ y: useTransform(scrollYProgress, [0, 0.5], [0, 100]) }}
          className="absolute inset-0"
        >
          <img 
            src={post.image} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        </motion.div>

        <div className="relative z-10 w-full px-4 pb-12">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Link 
                  href="/blog"
                  className="flex items-center gap-1 text-white/60 hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Blog
                </Link>
                <span className="text-white/30">|</span>
                <span className="px-3 py-1 text-xs font-medium text-white/80 bg-white/10 rounded-full border border-white/20">
                  {post.category}
                </span>
              </div>
              
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter mb-4">
                {post.title}
              </h1>
              
              <div className="flex items-center gap-4 text-sm text-white/50">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {post.readTime}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  {post.author}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Article Content */}
      <motion.article 
        style={{ y: contentY }}
        className="relative z-10 px-4 -mt-8"
      >
        <div className="max-w-3xl mx-auto">
          {/* Author Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-between p-4 mb-8 rounded-xl bg-zinc-900/50 border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-6 h-6 text-white/60" />
              </div>
              <div>
                <p className="text-white font-medium">{post.author}</p>
                <p className="text-white/50 text-sm">{post.authorRole}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                <Bookmark className="w-5 h-5" />
              </button>
              <button className="p-2.5 text-white/60 hover:text-red-400 hover:bg-white/10 rounded-full transition-all">
                <Heart className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Article Body */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="prose prose-invert prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Article Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16 pt-8 border-t border-white/10"
          >
            <div className="flex items-center justify-between">
              <Link 
                href="/blog"
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to all articles
              </Link>
              
              <div className="flex items-center gap-2">
                <span className="text-white/40 text-sm">Share:</span>
                <button className="p-2 text-white/40 hover:text-white transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.article>

      {/* Related Posts */}
      <section className="relative z-10 px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-white tracking-tighter mb-8">More Articles</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {blogPosts
              .filter(p => p.id !== post.id)
              .slice(0, 2)
              .map((relatedPost, index) => (
                <motion.article
                  key={relatedPost.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link href={`/blog/${relatedPost.id}`} className="group block">
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden mb-3">
                      <motion.img 
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.4 }}
                        src={relatedPost.image}
                        alt={relatedPost.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-xs font-medium text-white/50">{relatedPost.category}</span>
                    <h3 className="text-lg font-bold text-white group-hover:text-white/80 transition-colors mt-1">
                      {relatedPost.title}
                    </h3>
                  </Link>
                </motion.article>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
