"use client";

import { useState } from "react";
import { MockExamQuestions, Question } from "@/lib/examData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2 } from "lucide-react";

export default function QuestionCRUDPage() {
  const [questions, setQuestions] = useState<Question[]>(MockExamQuestions);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Question>>({
    id: "",
    text: "",
    options: [{ id: "o1", text: "" }, { id: "o2", text: "" }],
    correctAnswerId: "o1",
    subject: "",
    topic: "",
    difficulty: "Intermediate",
    explanation: ""
  });

  const handleEdit = (q: Question) => {
    setEditingId(q.id);
    setFormData({ ...q });
  };

  const handleDelete = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSave = () => {
    if (editingId) {
       setQuestions(questions.map(q => q.id === editingId ? { ...q, ...formData } as Question : q));
    } else {
       setQuestions([...questions, { ...formData, id: `q_${Date.now()}` } as Question]);
    }
    setEditingId(null);
    setFormData({
      id: "", text: "", options: [{ id: "o1", text: "" }, { id: "o2", text: "" }],
      correctAnswerId: "o1", subject: "", topic: "", difficulty: "Intermediate", explanation: ""
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Question Manager</h2>
          <p className="text-muted-foreground mt-2">Create, update, and manage exam questions.</p>
        </div>
        <Button onClick={() => setEditingId("")}><Plus className="mr-2 h-4 w-4"/> Add Question</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Form */}
        {editingId !== null && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{editingId === "" ? "New Question" : "Edit Question"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea 
                  value={formData.text}
                  onChange={e => setFormData({ ...formData, text: e.target.value })}
                  placeholder="Enter the question text" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input 
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Input 
                    value={formData.topic}
                    onChange={e => setFormData({ ...formData, topic: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(v) => setFormData({ ...formData, difficulty: v as "Beginner" | "Intermediate" | "Advanced" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Options</Label>
                {formData.options?.map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="text-sm font-semibold w-6">{String.fromCharCode(65 + i)}</span>
                    <Input 
                      value={opt.text}
                      onChange={e => {
                        const newOptions = [...formData.options!];
                        newOptions[i].text = e.target.value;
                        setFormData({ ...formData, options: newOptions });
                      }}
                    />
                    <input 
                      type="radio" 
                      name="correctAnswer" 
                      checked={formData.correctAnswerId === opt.id}
                      onChange={() => setFormData({ ...formData, correctAnswerId: opt.id })}
                    />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  const newId = `o${(formData.options?.length || 0) + 1}`;
                  setFormData({ ...formData, options: [...(formData.options || []), { id: newId, text: "" }]});
                }}>
                  Add Option
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Explanation</Label>
                <Textarea 
                  value={formData.explanation}
                  onChange={e => setFormData({ ...formData, explanation: e.target.value })} 
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                <Button onClick={handleSave}>Save Question</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question List */}
        <div className={`space-y-4 ${editingId !== null ? 'lg:col-span-1' : 'lg:col-span-2'}`}>
          {questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="p-4 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-primary uppercase">
                    Q{idx + 1} | {q.subject}
                  </div>
                  <p className="font-medium text-lg">{q.text}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" aria-label={`Edit question ${idx + 1}`} onClick={() => handleEdit(q)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete question ${idx + 1}`} className="text-destructive" onClick={() => handleDelete(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
