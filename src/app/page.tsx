'use client';

import DinoGame from '@/components/DinoGame';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-600 to-teal-500 flex items-center justify-center p-4">
      <div className="bg-blue-900/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-4xl w-full border-4 border-cyan-400 relative overflow-hidden">
        {/* Underwater bubble effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 left-8 w-3 h-3 bg-white/30 rounded-full animate-bounce"></div>
          <div className="absolute top-12 right-16 w-2 h-2 bg-cyan-200/40 rounded-full animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-4 h-4 bg-white/20 rounded-full animate-bounce delay-300"></div>
          <div className="absolute bottom-8 right-8 w-2 h-2 bg-blue-200/50 rounded-full animate-pulse delay-500"></div>
        </div>
        
        <div className="text-center mb-6 relative z-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent mb-3">
            🐠 Underwater Adventure
          </h1>
          <p className="text-lg text-cyan-100 font-semibold">Swim past sharks, dodge octopuses, avoid jellyfish!</p>
          <div className="flex justify-center space-x-4 mt-2">
            <span className="px-3 py-1 bg-teal-600 text-teal-100 rounded-full text-sm font-bold">🌊 Ocean Theme</span>
            <span className="px-3 py-1 bg-blue-600 text-blue-100 rounded-full text-sm font-bold">🐟 Fish Character</span>
            <span className="px-3 py-1 bg-indigo-600 text-indigo-100 rounded-full text-sm font-bold">🦈 Sea Creatures</span>
          </div>
        </div>
        
        <div className="flex justify-center">
          <DinoGame />
        </div>
        
        <div className="text-center mt-6 space-y-2 relative z-10">
          <div className="bg-gradient-to-r from-teal-800/80 to-blue-800/80 rounded-lg p-4 border border-cyan-500/30">
            <p className="text-lg font-semibold text-cyan-100 mb-2">🌊 Swimming Controls</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <p className="text-cyan-200"><strong>Desktop:</strong> SPACE to swim up • DOWN arrow to dive</p>
              <p className="text-teal-200"><strong>Mobile:</strong> Tap to swim up • Hold right to dive</p>
            </div>
          </div>
          <p className="text-cyan-200 font-medium">🐠 Navigate the underwater world and avoid dangerous sea creatures!</p>
          <div className="flex justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🦈</span>
              <span className="text-cyan-300">Sharks</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🐙</span>
              <span className="text-purple-300">Octopuses</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎐</span>
              <span className="text-pink-300">Jellyfish</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}