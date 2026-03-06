## MDX Collab

MDX Collab is a student community platform built for the Middlesex University Hackathon 2026. This earned us 2nd place. It is a place where students can discover collaborations, suggest and join events, message each other directly and also interact with a campus-focused AI assistant.

## What MDX Collab does

- Collaboration board where students can post project ideas and upload supporting files.
- Events flow where students can suggest events, university admins can approve/deny events. 
- Personal schedule that allows students to combine event signups with manual timetable entries. 
- Direct messaging system that allows students to message each other directly. 
- AI assistant that can answer questions about the university and campus life. 
- Custom dashboard created for screens around university to display events and collaborations. Also includes live poll support where the university can add custom polls that students can vote on. 
- Mobile view for mobile devices, making it more accessible. 

## Tech Stack

- The front end was built in React 19, TypeScript, Vite, React Router 7, Zustand and CSS for styling. 
- Server runing uses Node.js 22 for Cloud Functions. 
- For AI integration, Supabased Edge Function and OpenAI API were used. 
- For testing/linting, vitest + testing library and ES lint were used. 

## How MDX Collab is built

1. The frontend uses Firebase client SDKs directly for auth, Firestore read/writes, storage uploads and callable functions. 
2. Cloud functions handle trusted/server-side actions: 
    - Poll lifecycle and voting rules
    - Direct conversation creation and message sending, marking conversations as read 
    - Admin-only event deletion and cleanup
    - Firestore and Storage rules enforce access control at the data layer.
    - Firebase Hosting serves the built frontend as an SPA. 
    - The AI assistant requests to go a Supabase Edge Function that runs retrieval. Open-AI is used for generation. 

## Website is live!

The website can be checked out at: https://mdxcollab.space/