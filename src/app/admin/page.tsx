"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { describeImageAction } from "@/app/actions/aiActions";
import { Upload, Sparkles, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("");
  const [context, setContext] = useState("");
  const [aiResult, setAiResult] = useState<{ summary: string; detailed: string; structuredData: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      setAiResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAI = async () => {
    if (!imagePreview) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // Extract base64 part
      const base64Data = imagePreview.split(',')[1];
      const result = await describeImageAction(base64Data, imageMime, context);
      
      if (result.success && result.data) {
        setAiResult(result.data);
      } else {
        setError(result.error || "Failed to generate AI description");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Content Manager</h2>
        <p className="text-muted-foreground mt-2">
          Create accessible exam content. Upload diagrams to automatically generate layered visual descriptions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Image Upload</CardTitle>
              <CardDescription>Upload diagrams, charts, or maps for the exam.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-upload">Select Image</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    id="image-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {imagePreview && (
                <div className="mt-4 border rounded-lg overflow-hidden bg-muted/50 p-2 flex justify-center">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-64 object-contain rounded-md shadow-sm"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="context">Context (Optional)</Label>
                <Textarea 
                  id="context"
                  placeholder="E.g., 'This is a biology question about the human heart for high schoolers.'"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleGenerateAI} 
                disabled={!imagePreview || isGenerating}
                className="w-full gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isGenerating ? "Generating Descriptions..." : "Generate AI Descriptions"}
              </Button>
            </CardFooter>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Output Column */}
        <div className="space-y-6">
          <Card className={`transition-all duration-300 ${aiResult ? 'border-primary shadow-md' : 'border-dashed opacity-70'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Layered Description</CardTitle>
                {aiResult && <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle2 className="h-3 w-3" /> Ready</Badge>}
              </div>
              <CardDescription>AI-generated accessible descriptions for screen readers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {aiResult ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-primary">Summary (Alt Text)</Label>
                      <Badge variant="outline">1-2 sentences</Badge>
                    </div>
                    <Textarea 
                      readOnly
                      value={aiResult.summary}
                      className="resize-none bg-muted/30 focus-visible:ring-0"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-primary">Detailed Description</Label>
                      <Badge variant="outline">Comprehensive</Badge>
                    </div>
                    <Textarea 
                      readOnly
                      value={aiResult.detailed}
                      className="resize-none bg-muted/30 focus-visible:ring-0 min-h-[150px]"
                    />
                  </div>

                  {aiResult.structuredData && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold text-primary">Structured Data</Label>
                        <Badge variant="outline">Tabular/CSV</Badge>
                      </div>
                      <Textarea 
                        readOnly
                        value={aiResult.structuredData}
                        className="resize-none bg-muted/30 font-mono text-xs focus-visible:ring-0"
                        rows={4}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Upload className="h-12 w-12 mb-4 opacity-20" />
                  <p>Upload an image and generate AI descriptions to see the results here.</p>
                </div>
              )}
            </CardContent>
            {aiResult && (
              <CardFooter className="bg-muted/30 pt-4 rounded-b-xl border-t">
                <Button variant="outline" className="w-full">Save Content to Database</Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
