'use client';

import { motion } from 'framer-motion';
import EventCard from '@/components/ui/EventCard';

interface Event {
  id: number;
  title: string;
  date: string;
  venue: string;
  price: string;
  imageColor: string;
  category: string;
  imageUrl?: string;
}

interface EventRowProps {
  title: string;
  events: Event[];
  bgColor?: string;
}

export default function EventRow({ title, events, bgColor = 'bg-black' }: EventRowProps) {
  return (
    <section className={`py-12 ${bgColor} border-b border-gray-900`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl font-black text-white tracking-tight"
          >
            {title}
          </motion.h2>
          <a href="/events" className="text-gray-400 hover:text-white transition-colors text-sm font-bold tracking-wide">
            SEE ALL
          </a>
        </div>

        {/* Dice-style horizontal scroll */}
        <div className="relative -mx-4 px-4 overflow-x-auto pb-8 scrollbar-hide snap-x snap-mandatory">
          <div className="flex gap-6 min-w-max">
            {events.map((event) => (
              <div key={event.id} className="snap-start w-[280px] md:w-[320px]">
                <EventCard {...event} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
