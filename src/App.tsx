import { useState, useRef, useEffect } from "react";
import { Message } from "./components/Message";
import { ChatInput } from "./components/ChatInput";
import { ChatHeader } from "./components/ChatHeader";
import { Sidebar } from "./components/Sidebar";
import { InvestorProfile } from "./components/InvestorProfile";
import { LoginPage } from "./components/LoginPage";
import { SettingsDialog } from "./components/SettingsDialog";
import { ScrollArea } from "./components/ui/scroll-area";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  senderName: string;
  senderAvatar?: string;
  searchQuery?: string;
  candidates?: any[];
}

const mockInvestors = [
  {
    id: "1",
    name: "Carlos Mendoza",
    title: "Managing Partner",
    company: "LATAM Capital Partners",
    location: "São Paulo, Brazil",
    rating: 4.8,
    email: "carlos.mendoza@latamcapital.com",
    phone: "+55 11 3456-7890",
    availability: "Available in 2 weeks",
    aum: "$500M - $1B",
    lastActive: "2 days ago",
    summary: "Seasoned institutional investor with 15+ years of experience in LATAM markets. Specializes in growth-stage technology companies and infrastructure investments across Brazil, Mexico, and Argentina.",
    expertise: ["Technology", "Infrastructure", "Real Estate", "Healthcare"],
    experience: "15+ years",
    regions: ["Brazil", "Mexico", "Argentina", "Chile"]
  },
  {
    id: "2", 
    name: "Maria Rodriguez",
    title: "Investment Director",
    company: "Bancolombia Asset Management",
    location: "Bogotá, Colombia",
    rating: 4.6,
    email: "maria.rodriguez@bancolombia.com",
    phone: "+57 1 234-5678",
    availability: "Available immediately",
    aum: "$100M - $500M",
    lastActive: "1 week ago",
    summary: "Expert in ESG investing and sustainable finance across Latin America. Leads institutional client relationships and portfolio management for high-net-worth individuals and family offices.",
    expertise: ["ESG Investing", "Sustainable Finance", "Fixed Income", "Private Equity"],
    experience: "12+ years",
    regions: ["Colombia", "Peru", "Ecuador", "Panama"]
  },
  {
    id: "3",
    name: "Roberto Silva",
    title: "Senior Portfolio Manager", 
    company: "XP Investimentos",
    location: "Rio de Janeiro, Brazil",
    rating: 4.7,
    email: "roberto.silva@xpi.com.br",
    phone: "+55 21 9876-5432",
    availability: "Available in 1 week",
    aum: "$250M - $750M",
    lastActive: "3 days ago",
    summary: "Institutional portfolio manager focused on alternative investments and hedge fund strategies. Strong track record in Latin American equities and fixed income markets with expertise in risk management.",
    expertise: ["Alternative Investments", "Hedge Funds", "Equities", "Risk Management"],
    experience: "10+ years",
    regions: ["Brazil", "Uruguay", "Paraguay"]
  }
];

const searchHistory = [
  {
    id: "1",
    title: "LATAM Infrastructure Investors",
    date: "24/09/2025",
    isActive: true
  },
  {
    id: "2", 
    title: "ESG-focused Fund Managers",
    date: "23/09/2025"
  },
  {
    id: "3",
    title: "Brazilian Private Equity Partners",
    date: "22/09/2025"
  },
  {
    id: "4",
    title: "Mexican Pension Fund Managers",
    date: "21/09/2025"
  }
];

function AppContent() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      content: "Hello! I'm BrunelAI, your intelligent institutional investor search assistant. I can help you find the perfect institutional investors for your needs across Latin America. What type of investors are you looking to connect with?",
      isUser: false,
      timestamp: "10:30",
      senderName: "BrunelAI"
    },
    {
      id: "2",
      content: "I'm looking for institutional investors in LATAM with experience in infrastructure investments, preferably with AUM over $500M",
      isUser: true,
      timestamp: "10:32",
      senderName: "You",
      searchQuery: "LATAM Infrastructure Investors with 500M+ AUM"
    },
    {
      id: "3",
      content: "Great! I found 3 qualified institutional investors from LinkedIn, CRM, and Apollo matching your requirements for \"LATAM Infrastructure Investors with 500M+ AUM\". Here are their profiles:",
      isUser: false,
      timestamp: "10:33",
      senderName: "BrunelAI",
      candidates: mockInvestors
    }
  ]);

  const [selectedInvestor, setSelectedInvestor] = useState<any>(mockInvestors[0]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = (content: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: "You",
      searchQuery: content
    };

    setMessages(prev => [...prev, newMessage]);

    // Simulate AI response
    setTimeout(() => {
      const responseMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `I'm searching our database of institutional investors across LinkedIn, CRM systems, and Apollo for matches to "${content}". Let me find the best candidates for you...`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        senderName: "BrunelAI",
        candidates: content.toLowerCase().includes('esg') || content.toLowerCase().includes('sustainable') 
          ? [mockInvestors[1]] 
          : mockInvestors.slice(0, 2)
      };

      setMessages(prev => [...prev, responseMessage]);
    }, 1000 + Math.random() * 2000);
  };

  const handleInvestorClick = (investorId: string) => {
    const investor = mockInvestors.find(inv => inv.id === investorId);
    if (investor) {
      setSelectedInvestor(investor);
    }
  };

  const handleNewSearch = () => {
    setMessages([{
      id: "new-1",
      content: "Hello! I'm BrunelAI, your intelligent institutional investor search assistant. I can help you find the perfect institutional investors for your needs across Latin America. What type of investors are you looking to connect with?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: "BrunelAI"
    }]);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <div className="h-screen flex bg-background">
        {/* Left Sidebar */}
        <Sidebar 
          onNewSearch={handleNewSearch}
          searchHistory={searchHistory}
          onSelectSearch={(searchId) => console.log('Selected search:', searchId)}
          onSettingsClick={() => setSettingsOpen(true)}
        />
        
        {/* Main Chat Area - More Centered */}
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-5xl flex flex-col h-full">
            <ChatHeader 
              searchTitle="LATAM Infrastructure Investors"
              isConnected={true}
              connectionSource="LinkedIn"
            />
            
            <ScrollArea ref={scrollAreaRef} className="flex-1 h-0">
              <div className="p-6 space-y-1">
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    content={message.content}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                    senderName={message.senderName}
                    senderAvatar={message.senderAvatar}
                    searchQuery={message.searchQuery}
                    candidates={message.candidates}
                    onInvestorClick={handleInvestorClick}
                  />
                ))}
              </div>
            </ScrollArea>

            <ChatInput onSendMessage={handleSendMessage} />
          </div>
        </div>

        {/* Right Sidebar - Investor Profile */}
        {selectedInvestor && (
          <InvestorProfile 
            investor={selectedInvestor}
            onClose={() => setSelectedInvestor(null)}
          />
        )}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}