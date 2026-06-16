export const stats = [
  { label: "Documents", value: 47, change: "+12%", icon: "FileText" },
  { label: "Questions Asked", value: 1284, change: "+23%", icon: "MessageSquare" },
  { label: "Study Hours", value: 86, change: "+8%", icon: "Clock" },
  { label: "Quizzes Generated", value: 32, change: "+15%", icon: "BrainCircuit" },
  { label: "Learning Streak", value: "14 days", change: "🔥", icon: "Flame" },
  { label: "AI Sessions", value: 219, change: "+34%", icon: "Sparkles" },
];

export const recentActivity = [
  { id: 1, action: "Generated quiz", target: "DBMS - Normalization", time: "2 min ago" },
  { id: 2, action: "Uploaded", target: "OS-Chapter-7.pdf", time: "1 hour ago" },
  { id: 3, action: "Completed", target: "Computer Networks summary", time: "3 hours ago" },
  { id: 4, action: "Reviewed flashcards", target: "Data Structures", time: "yesterday" },
  { id: 5, action: "Asked AI", target: "Explain TCP handshake", time: "yesterday" },
];

export const upcomingExams = [
  { id: 1, subject: "Database Management", date: "Jun 22", days: 6, color: "from-blue-500 to-indigo-500" },
  { id: 2, subject: "Operating Systems", date: "Jun 28", days: 12, color: "from-purple-500 to-pink-500" },
  { id: 3, subject: "Computer Networks", date: "Jul 04", days: 18, color: "from-fuchsia-500 to-rose-500" },
];

export const todaysPlan = [
  { id: 1, time: "09:00", task: "Revise SQL Joins", duration: "45m", done: true },
  { id: 2, time: "10:00", task: "Practice quiz: Normalization", duration: "30m", done: true },
  { id: 3, time: "14:00", task: "Read OS Chapter 7", duration: "1h", done: false },
  { id: 4, time: "16:00", task: "Flashcards: TCP/IP", duration: "20m", done: false },
  { id: 5, time: "19:00", task: "Mock interview prep", duration: "1h", done: false },
];

export const weakTopics = [
  { topic: "Normalization", subject: "DBMS", strength: 38 },
  { topic: "Deadlock", subject: "OS", strength: 42 },
  { topic: "Routing Algorithms", subject: "CN", strength: 51 },
  { topic: "Process Scheduling", subject: "OS", strength: 58 },
  { topic: "Indexing", subject: "DBMS", strength: 64 },
];

export const aiRecommendations = [
  { id: 1, title: "Master Normalization in 30 min", desc: "AI-curated lesson based on your weak areas" },
  { id: 2, title: "Quiz: Process Scheduling", desc: "10 questions, medium difficulty" },
  { id: 3, title: "Watch: TCP/IP deep dive", desc: "Suggested from your saved notes" },
];

export const documents = [
  { id: 1, name: "DBMS-Notes-Unit-3.pdf", size: "2.4 MB", date: "Jun 14, 2026", type: "pdf", status: "Processed" },
  { id: 2, name: "OS-Chapter-7.pdf", size: "5.1 MB", date: "Jun 12, 2026", type: "pdf", status: "Processed" },
  { id: 3, name: "Networks-Lecture.pptx", size: "8.7 MB", date: "Jun 10, 2026", type: "ppt", status: "Processed" },
  { id: 4, name: "Handwritten-Algo.jpg", size: "1.2 MB", date: "Jun 08, 2026", type: "image", status: "OCR Done" },
  { id: 5, name: "ML-Cheatsheet.docx", size: "640 KB", date: "Jun 05, 2026", type: "doc", status: "Processed" },
  { id: 6, name: "Compiler-Design.pdf", size: "3.8 MB", date: "Jun 03, 2026", type: "pdf", status: "Processing" },
];

export const chatHistory = [
  { id: 1, title: "Explain B+ Trees", time: "Today" },
  { id: 2, title: "Difference between TCP & UDP", time: "Today" },
  { id: 3, title: "Deadlock prevention techniques", time: "Yesterday" },
  { id: 4, title: "Normalization 1NF to BCNF", time: "Yesterday" },
  { id: 5, title: "What is virtual memory?", time: "2 days ago" },
];

export const demoConversation = [
  { role: "user", content: "Explain the TCP three-way handshake in simple terms." },
  {
    role: "ai",
    content:
      "The TCP three-way handshake is how two computers agree to start talking. **Step 1 (SYN):** Client says 'Hi, can we talk?' **Step 2 (SYN-ACK):** Server replies 'Yes, I'm ready — are you?' **Step 3 (ACK):** Client confirms 'Great, let's go!' Now data can flow reliably.",
    sources: ["Networks-Lecture.pptx · Slide 14", "DBMS-Notes-Unit-3.pdf"],
  },
  { role: "user", content: "Give me a 3-question quiz on this." },
  {
    role: "ai",
    content:
      "Sure! 1) Which flag initiates the handshake? 2) Why is a third ACK needed? 3) What attack exploits incomplete handshakes? Want me to grade your answers?",
    sources: [],
  },
];

export const suggestedQuestions = [
  "Summarize chapter 4 of OS",
  "Create flashcards for SQL joins",
  "What's the difference between B-tree and B+ tree?",
  "Generate a 10-question quiz on Networks",
];

export const quizQuestions = [
  {
    q: "Which normal form removes transitive dependencies?",
    options: ["1NF", "2NF", "3NF", "BCNF"],
    answer: 2,
  },
  {
    q: "What does ACID stand for in databases?",
    options: [
      "Atomicity, Consistency, Isolation, Durability",
      "Access, Control, Integrity, Data",
      "Atomic, Cached, Indexed, Distributed",
      "All Calls Identify Data",
    ],
    answer: 0,
  },
  {
    q: "Which is NOT a SQL join type?",
    options: ["INNER", "OUTER", "CROSS", "PARALLEL"],
    answer: 3,
  },
  {
    q: "Primary key constraint enforces:",
    options: ["Nullability", "Uniqueness + non-null", "Foreign reference", "Indexing only"],
    answer: 1,
  },
];

export const flashcards = [
  { q: "What is normalization?", a: "Organizing data to reduce redundancy and improve integrity." },
  { q: "Define deadlock.", a: "A state where two or more processes wait indefinitely for resources held by each other." },
  { q: "What is virtual memory?", a: "An abstraction allowing programs to use more memory than physically available via paging." },
  { q: "TCP vs UDP?", a: "TCP is reliable, connection-oriented; UDP is fast, connectionless." },
  { q: "What is a primary key?", a: "A column (or set) that uniquely identifies each row in a table." },
];

export const studyHoursData = [
  { day: "Mon", hours: 3.2 },
  { day: "Tue", hours: 4.5 },
  { day: "Wed", hours: 2.8 },
  { day: "Thu", hours: 5.1 },
  { day: "Fri", hours: 3.7 },
  { day: "Sat", hours: 6.4 },
  { day: "Sun", hours: 4.2 },
];

export const quizScoresData = [
  { name: "DBMS", score: 82 },
  { name: "OS", score: 67 },
  { name: "CN", score: 74 },
  { name: "DSA", score: 91 },
  { name: "ML", score: 78 },
];

export const progressData = [
  { week: "W1", progress: 22 },
  { week: "W2", progress: 38 },
  { week: "W3", progress: 51 },
  { week: "W4", progress: 64 },
  { week: "W5", progress: 78 },
  { week: "W6", progress: 86 },
];

export const predictorQuestions = {
  high: [
    { q: "Explain ACID properties with examples", topic: "DBMS", prob: 92 },
    { q: "Compare 3NF and BCNF", topic: "DBMS", prob: 88 },
    { q: "Banker's algorithm for deadlock avoidance", topic: "OS", prob: 85 },
  ],
  medium: [
    { q: "Different page replacement algorithms", topic: "OS", prob: 72 },
    { q: "OSI vs TCP/IP model", topic: "CN", prob: 68 },
  ],
  low: [
    { q: "History of relational databases", topic: "DBMS", prob: 34 },
    { q: "Compare IPv4 and IPv6 in detail", topic: "CN", prob: 41 },
  ],
};

export const testimonials = [
  { name: "Aisha Khan", role: "CS Student, IIT Delhi", text: "StudyGPT cut my revision time in half. The AI tutor is unreal.", avatar: "AK" },
  { name: "Rohan Mehta", role: "GATE Aspirant", text: "Weak topic detector found gaps I didn't know I had. Scored 94 percentile.", avatar: "RM" },
  { name: "Priya Sharma", role: "Engineering, NIT", text: "The flashcards and quizzes from my own notes are pure magic.", avatar: "PS" },
];

export const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: ["5 documents", "100 AI questions/mo", "Basic quizzes", "Community support"],
    cta: "Start Free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    features: ["Unlimited documents", "Unlimited AI chat", "Voice assistant", "All quiz modes", "Priority AI", "Mock interviews"],
    cta: "Go Pro",
    featured: true,
  },
  {
    name: "Campus",
    price: "Custom",
    period: "for teams",
    features: ["Everything in Pro", "Team analytics", "Admin dashboard", "SSO + LMS sync", "Dedicated success manager"],
    cta: "Contact Sales",
    featured: false,
  },
];

export const faqs = [
  { q: "Is my data private?", a: "Yes. Your notes never train any external model and are encrypted at rest." },
  { q: "Which file types are supported?", a: "PDF, DOCX, PPT, images, and handwritten notes via OCR." },
  { q: "Can I use it offline?", a: "Some features (flashcards, saved summaries) work offline in the mobile app." },
  { q: "Do you support regional languages?", a: "Yes — English, Hindi, Gujarati and more, with real-time translation." },
  { q: "How accurate is the exam predictor?", a: "It analyzes past papers + your syllabus and ranks by historical probability." },
];

export const adminUsers = [
  { id: 1, name: "Aisha Khan", email: "aisha@iitd.ac.in", plan: "Pro", status: "Active", joined: "Mar 2026" },
  { id: 2, name: "Rohan Mehta", email: "rohan@gateprep.in", plan: "Pro", status: "Active", joined: "Feb 2026" },
  { id: 3, name: "Priya Sharma", email: "priya@nitw.ac.in", plan: "Free", status: "Active", joined: "Jan 2026" },
  { id: 4, name: "Vikram Patel", email: "vikram@bits.ac.in", plan: "Campus", status: "Active", joined: "Dec 2025" },
  { id: 5, name: "Neha Gupta", email: "neha@du.ac.in", plan: "Free", status: "Inactive", joined: "Nov 2025" },
];

export const adminStats = [
  { label: "Total Users", value: "24,891", change: "+18%" },
  { label: "Active Users", value: "8,142", change: "+11%" },
  { label: "Documents Uploaded", value: "187K", change: "+24%" },
  { label: "AI Requests", value: "2.1M", change: "+42%" },
];