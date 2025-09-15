// "use client";

// import { useGoogleLogin } from '@react-oauth/google';
// import { useRouter } from 'next/navigation';

// export default function LoginPage() {
//   const router = useRouter();

//   const login = useGoogleLogin({
//     onSuccess: async (codeResponse) => {
//       try {
//         const res = await fetch('http://localhost:3001/auth/google', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ code: codeResponse.code }),
//         });
//         if (res.ok) {
//           router.push('/campaigns');
//         } else {
//           console.error("Backend login failed");
//           alert("Login failed. The server could not authenticate you.");
//         }
//       } catch (error) {
//         console.error("An error occurred during the login process:", error);
//         alert("An error occurred. Please try again later.");
//       }
//     },
//     flow: 'auth-code',
//     onError: () => {
//         console.error('Google login failed');
//         alert('Google login failed. Please try again.');
//     }
//   });

//   return (
//     <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
//       <div style={{ textAlign: 'center' }}>
//         <h1 style={{ marginBottom: '2rem' }}>Login to Xeno CRM</h1>
//         <button 
//           onClick={() => login()} 
//           style={{ padding: '12px 24px', fontSize: '18px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}
//         >
//           Sign in with Google 🚀
//         </button>
//       </div>
//     </div>
//   );
// }



"use client";

import { useGoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const res = await fetch('http://localhost:3001/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeResponse.code }),
          credentials: 'include'
        });
        if (res.ok) {
          router.push('/campaigns');
        } else {
          console.error("Backend login failed");
          alert("Login failed. The server could not authenticate you.");
        }
      } catch (error) {
        console.error("An error occurred during the login process:", error);
        alert("An error occurred. Please try again later.");
      }
    },
    flow: 'auth-code',
    onError: () => {
        console.error('Google login failed');
        alert('Google login failed. Please try again.');
    }
  });

  const handlePseudoLogin = async () => {
    try {
      const res = await fetch('http://localhost:3001/auth/pseudo-login', {
        credentials: 'include' // Crucial to save the session cookie
      });
      if (res.ok) {
        router.push('/campaigns'); // Redirect on success
      } else {
        alert("Pseudo-login failed on the server.");
      }
    } catch (error) {
      console.error("Pseudo-login error:", error);
      alert("Could not connect to the server for pseudo-login.");
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: '2rem' }}>Login to Xeno CRM</h1>
        <button 
          onClick={() => login()} 
          style={{ padding: '12px 24px', fontSize: '18px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          Sign in with Google 🚀
        </button>

        <div style={{ marginTop: '20px' }}>
          <button 
            onClick={handlePseudoLogin}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Dev Login (Bypass Google)
          </button>
        </div>
      </div>
    </div>
  );
}