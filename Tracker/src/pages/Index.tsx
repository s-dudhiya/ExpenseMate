import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Utensils, Truck, Receipt, TrendingUp, Shield, Smartphone, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Utensils,
      title: 'Tiffin Tracking',
      description: 'Track your daily tiffin expenses with smart categorization'
    },
    {
      icon: Truck,
      title: 'Delivery Management',
      description: 'Monitor delivery charges and keep tabs on food orders'
    },
    {
      icon: Receipt,
      title: 'Expense Categories',
      description: 'Organize expenses with custom categories and notes'
    },
    {
      icon: TrendingUp,
      title: 'Smart Analytics',
      description: 'Get insights into your spending patterns and trends'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your financial data is encrypted and secure'
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      description: 'Access your expenses anywhere, on any device'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ExpenseMate
            </h1>
          </div>
          <Button
            onClick={() => navigate('/auth')}
            className="bg-gradient-primary hover:opacity-90 shadow-elegant"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <Badge variant="secondary" className="mb-4 bg-gradient-primary/10 text-primary border-primary/20">
            Smart Expense Tracking
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Track Your
            <span className="bg-gradient-primary bg-clip-text text-transparent block">
              Expenses
            </span>
            Effortlessly
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Take control of your daily expenses with ExpenseMate. Track tiffin, delivery, 
            and miscellaneous expenses with ease. Get insights into your spending patterns 
            and stay on top of your finances.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button
              onClick={() => navigate('/auth')}
              size="lg"
              className="bg-gradient-primary hover:opacity-90 shadow-elegant text-lg px-8 py-6"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Start Tracking Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 border-primary/20 hover:bg-primary/5"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Why Choose ExpenseMate?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed to make expense tracking simple and effective
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-elegant hover:shadow-lg transition-all duration-300 border-muted/50 hover:border-primary/20">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
                  <feature.icon className="h-8 w-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-primary/5 border-primary/10 shadow-elegant">
          <CardContent className="text-center py-16 px-8">
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already tracking their expenses smarter with ExpenseMate
            </p>
            <Button
              onClick={() => navigate('/auth')}
              size="lg"
              className="bg-gradient-primary hover:opacity-90 shadow-elegant text-lg px-12 py-6"
            >
              <LogIn className="h-5 w-5 mr-3" />
              Create Your Account
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Wallet className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
                ExpenseMate
              </span>
            </div>
            <p className="text-muted-foreground text-center">
              © 2024 ExpenseMate. Track smarter, spend wiser.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
