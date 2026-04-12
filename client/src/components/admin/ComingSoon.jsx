import React from 'react';
import { ShieldAlert } from 'lucide-react';

function ComingSoon({ view }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-reveal">
      <div className="w-20 h-20 bg-gray-50 dark:bg-zinc-800/50 rounded-3xl flex items-center justify-center mb-6 text-gray-300">
        <ShieldAlert size={40} />
      </div>
      <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Interface Pending</h2>
      <p className="text-gray-400 text-sm">The administration module for {view} is being finalized.</p>
    </div>
  );
}

export default ComingSoon;
