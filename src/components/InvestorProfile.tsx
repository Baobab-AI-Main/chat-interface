import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Star, Mail, Phone, MapPin, Calendar, DollarSign, Building, X } from "lucide-react";

interface InvestorProfileProps {
  investor: {
    id: string;
    name: string;
    title: string;
    company: string;
    location: string;
    avatar?: string;
    rating: number;
    email: string;
    phone: string;
    availability: string;
    aum: string;
    lastActive: string;
    summary: string;
    expertise: string[];
    experience: string;
    regions: string[];
  };
  onClose: () => void;
}

export function InvestorProfile({ investor, onClose }: InvestorProfileProps) {
  return (
    <div className="w-80 bg-card border-l flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="text-sm text-muted-foreground">Investor Profile</div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={investor.avatar} alt={investor.name} />
              <AvatarFallback className="bg-teal-100 text-teal-700">
                {investor.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{investor.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{investor.title}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm">{investor.rating}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-2">
              <h4 className="text-sm">Contact Information</h4>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-blue-600 truncate">{investor.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{investor.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{investor.location}</span>
              </div>
            </CardContent>
          </Card>

          {/* Availability & Investment Info */}
          <Card>
            <CardHeader className="pb-2">
              <h4 className="text-sm">Investment Profile</h4>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-green-600">{investor.availability}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span>{investor.aum}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span>{investor.company}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Last active: {investor.lastActive}</span>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <h4 className="text-sm">Summary</h4>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {investor.summary}
              </p>
            </CardContent>
          </Card>

          {/* Expertise */}
          <Card>
            <CardHeader className="pb-2">
              <h4 className="text-sm">Investment Focus</h4>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {investor.expertise.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Regions */}
          <Card>
            <CardHeader className="pb-2">
              <h4 className="text-sm">Geographic Focus</h4>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {investor.regions.map((region, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {region}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader className="pb-2">
              <h4 className="text-sm">Experience</h4>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span>{investor.experience}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}