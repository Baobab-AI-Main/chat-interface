import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Star, MapPin, Calendar, DollarSign } from "lucide-react";

interface InvestorCardProps {
  investor: {
    id: string;
    name: string;
    title: string;
    company: string;
    location: string;
    avatar?: string;
    rating: number;
    availability: string;
    aum: string;
    expertise: string[];
  };
  onClick: (investorId: string) => void;
}

export function InvestorCard({ investor, onClick }: InvestorCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onClick(investor.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={investor.avatar} alt={investor.name} />
            <AvatarFallback className="bg-teal-100 text-teal-700">
              {investor.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium truncate">{investor.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{investor.title}</p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{investor.rating}</span>
              </div>
            </div>
            
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{investor.location}</span>
                <span className="text-xs">•</span>
                <DollarSign className="w-3 h-3" />
                <span>{investor.aum}</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span className="text-green-600">{investor.availability}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {investor.expertise.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-2 py-0">
                  {skill}
                </Badge>
              ))}
              {investor.expertise.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0">
                  +{investor.expertise.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}