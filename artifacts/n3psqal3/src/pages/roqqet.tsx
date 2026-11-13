import { useState, useRef, useEffect } from "react";
import { useGetMe, useUpdateZodiac, useChatWithRoqqet, useGetDailyInsight, getGetMeQueryKey } from "@workspace/api-client-react";
import AdSlot from "@/components/ad-slot";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Rocket, Sparkles, Loader2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const zodiacSchema = z.object({
  birthDate: z.string().min(1, "Required"),
  birthTime: z.string().optional(),
  sunSign: z.string().min(1, "Required"),
  decan: z.coerce.number().min(1).max(3),
  moonSign: z.string().optional(),
  risingSign: z.string().optional(),
  descendantSign: z.string().optional(),
});

export default function RoqqetPage() {
  const { data: user } = useGetMe();
  const { data: insight } = useGetDailyInsight();
  const [messages, setMessages] = useState<Array<{role: 'user'|'assistant', content: string}>>([
    { role: 'assistant', content: 'Greetings. I am R0QQ3T. Establish your Starting 5 profile to calibrate the settlement matrix to your resonance.' }
  ]);
  const [input, setInput] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  
  const chat = useChatWithRoqqet();
  const updateZodiac = useUpdateZodiac();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof zodiacSchema>>({
    resolver: zodResolver(zodiacSchema),
    defaultValues: {
      birthDate: user?.zodiac?.birthDate || "",
      birthTime: user?.zodiac?.birthTime || "",
      sunSign: user?.zodiac?.sunSign || "",
      decan: user?.zodiac?.decan || 1,
      moonSign: user?.zodiac?.moonSign || "",
      risingSign: user?.zodiac?.risingSign || "",
      descendantSign: user?.zodiac?.descendantSign || "",
    }
  });

  // Init form when user data loads
  useEffect(() => {
    if (user?.zodiac) {
      const z = user.zodiac;
      form.reset({
        birthDate: z.birthDate,
        birthTime: z.birthTime ?? "",
        sunSign: z.sunSign,
        decan: z.decan,
        moonSign: z.moonSign ?? "",
        risingSign: z.risingSign ?? "",
        descendantSign: z.descendantSign ?? "",
      });
    }
  }, [user, form]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const onUpdateZodiac = (values: z.infer<typeof zodiacSchema>) => {
    updateZodiac.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Profile Calibrated", description: "R0QQ3T acknowledges your resonance." });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    });
  };

  const handleSend = () => {
    if (!input.trim() || chat.isPending) return;
    
    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput("");

    chat.mutate({ data: { messages: newMessages } }, {
      onSuccess: (res) => {
        setMessages([...newMessages, { role: 'assistant', content: res.reply }]);
      },
      onError: () => {
        toast({ title: "Comms Error", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
    <AdSlot placement="roqqet" />
    <div className="grid lg:grid-cols-2 gap-8 h-[calc(100vh-180px)]">
      {/* Left Column: Chat */}
      <Card className="flex flex-col bg-[#0a0a16] border-primary/30 h-full neon-border overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-4 bg-background/50">
          <CardTitle className="flex items-center gap-2">
            <Rocket className="text-primary w-5 h-5" />
            <span className="font-mono text-primary tracking-widest">R0QQ3T Link</span>
          </CardTitle>
          <CardDescription>Agentic Zodiac Systems Assistant</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={chatRef}>
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 font-mono text-sm leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-secondary text-secondary-foreground rounded-tr-sm' 
                      : 'bg-[#1a1a2e] text-primary border border-primary/20 rounded-tl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chat.isPending && (
                <div className="flex justify-start">
                  <div className="bg-[#1a1a2e] text-primary px-4 py-3 rounded-xl rounded-tl-sm border border-primary/20">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-4 border-t border-border/50 bg-background/50 flex gap-2">
            <Input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Query the system..." 
              className="bg-black/50 border-primary/30 font-mono focus-visible:ring-primary"
            />
            <Button onClick={handleSend} disabled={chat.isPending} className="bg-primary hover:bg-primary/80 text-primary-foreground">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right Column: Profile & Insights */}
      <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
        {insight && (
          <Card className="bg-gradient-to-br from-secondary/10 to-transparent border-secondary/30 shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-secondary text-sm uppercase tracking-widest">
                <Sparkles className="w-4 h-4" /> Daily Directive {insight.sign && `[${insight.sign}]`}
              </CardTitle>
              <h3 className="text-xl font-bold">{insight.title}</h3>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground font-mono text-sm">{insight.body}</p>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card/50 backdrop-blur-sm border-border flex-1">
          <CardHeader>
            <CardTitle>Starting 5 Profile</CardTitle>
            <CardDescription>Calibrate your astrological resonance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onUpdateZodiac)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="birthDate" render={({field}) => (
                    <FormItem><FormLabel>Birth Date*</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="birthTime" render={({field}) => (
                    <FormItem><FormLabel>Birth Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="sunSign" render={({field}) => (
                    <FormItem><FormLabel>Sun Sign*</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="decan" render={({field}) => (
                    <FormItem>
                      <FormLabel>Decan (1-3)*</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="moonSign" render={({field}) => (
                    <FormItem><FormLabel>Moon Sign</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="risingSign" render={({field}) => (
                    <FormItem><FormLabel>Rising Sign</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="descendantSign" render={({field}) => (
                    <FormItem><FormLabel>Descendant Sign</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <Button type="submit" className="w-full" disabled={updateZodiac.isPending}>
                  {updateZodiac.isPending ? "Calibrating..." : "Save Calibration"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}