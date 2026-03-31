import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-black text-white border-t border-gray-900 py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Image src="/logo.png" alt="Easy Entry" width={40} height={40} className="object-contain" />
          <span className="text-xl font-bold text-[#E5A823]">Easy Entry</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">Company</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Press</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">Help</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">Social</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-white transition-colors">TikTok</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4 text-white">Download</h3>
            <div className="flex flex-col gap-2">
               <button className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 hover:text-white hover:border-white transition-all text-left">
                 App Store
               </button>
               <button className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 hover:text-white hover:border-white transition-all text-left">
                 Google Play
               </button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} All rights reserved: Designed and Developed ❤️ Athryan Tech Solutions</p>
          <div className="flex gap-4 mt-4 md:mt-0">
             <span>Privacy Policy</span>
             <span>Cookie Settings</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
