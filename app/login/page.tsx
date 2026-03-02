// "use client";

// import { DynamicWidget } from "@dynamic-labs/sdk-react-core";

// export default function LoginPage() {
//   return (
//     <div className="h-screen flex items-center justify-center bg-black text-white">
//       <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl text-center">
//         <h1 className="text-2xl font-semibold mb-6">
//           Login to Block-Tix
//         </h1>

//         <DynamicWidget />

//       </div>
//     </div>
//   );
// }

"use client";

import Link from "next/link";

export default function LoginSelection() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-10">
      <h1 className="text-4xl font-bold">Login as</h1>

      <div className="flex gap-8">
        <Link href="/login/user">
          <button className="px-8 py-4 bg-green-600 rounded-xl text-lg">
            User
          </button>
        </Link>

        <Link href="/login/organizer">
          <button className="px-8 py-4 bg-purple-600 rounded-xl text-lg">
            Organizer
          </button>
        </Link>
      </div>
    </div>
  );
}

