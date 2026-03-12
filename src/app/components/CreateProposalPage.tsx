import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  FileText,
  Upload,
  CheckCircle2,
  Download,
  Users,
  UserPlus,
  Award,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

const steps = [
  { num: 1, label: "Ingest Solicitation" },
  { num: 2, label: "Organization Context" },
  { num: 3, label: "Review & Validate" },
  { num: 4, label: "Execution Plan" },
];

export function CreateProposalPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [solicitationFile, setSolicitationFile] = useState<string | null>(null);
  const [contextFile, setContextFile] = useState<string | null>(null);
  const [isDragging1, setIsDragging1] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);
  const [proposalTitle, setProposalTitle] = useState("Proposal for Playing Video Games During the COVI 19 and Well Being (1)");
  const [isAwarded, setIsAwarded] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent, setter: (name: string) => void, setDrag: (v: boolean) => void) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files.length > 0) {
      setter(e.dataTransfer.files[0].name);
    }
  }, []);

  const handleFileSelect = useCallback((setter: (name: string) => void) => {
    setter("sample_document.pdf");
  }, []);

  const advanceStep = () => {
    setCompletedSteps((prev) => new Set([...prev, currentStep]));
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-1 hover:bg-accent rounded transition-colors text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-foreground leading-tight">Create Proposal</h4>
            <p className="text-muted-foreground text-sm leading-tight">Leidos GenAI &middot; Internal Use</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {steps.map((step, i) => (
          <div key={step.num} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                  completedSteps.has(step.num)
                    ? "bg-green-100 text-green-600"
                    : currentStep === step.num
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {completedSteps.has(step.num) ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  step.num
                )}
              </div>
              <span
                className={`text-sm whitespace-nowrap ${
                  currentStep === step.num ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-16 md:w-24 h-px bg-border mx-3" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-border p-6 min-h-[400px]">
        {/* Step 1: Ingest Solicitation */}
        {currentStep === 1 && (
          <div>
            <h3 className="mb-6">Ingest Solicitation Document</h3>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging1(true); }}
              onDragLeave={() => setIsDragging1(false)}
              onDrop={(e) => handleDrop(e, setSolicitationFile, setIsDragging1)}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging1 ? "border-black bg-gray-50" : "border-gray-300"
              }`}
            >
              {solicitationFile ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                  <p className="text-sm">{solicitationFile}</p>
                  <p className="text-xs text-muted-foreground">File uploaded successfully</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm">Drag document here</p>
                  <p className="text-xs text-muted-foreground">or</p>
                  <button
                    onClick={() => handleFileSelect(setSolicitationFile)}
                    className="px-5 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
                  >
                    Select File
                  </button>
                </div>
              )}
            </div>
            {solicitationFile && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={advanceStep}
                  className="px-5 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Organization Context */}
        {currentStep === 2 && (
          <div>
            <h3 className="mb-6">Organization Context</h3>
            <div className="border border-border rounded-lg p-4 flex items-center justify-between mb-6">
              <span className="text-sm">Template Download</span>
              <button className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors">
                <Download className="w-4 h-4" />
                Download Template
              </button>
            </div>
            <h4 className="mb-3">Ingest Context Data</h4>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging2(true); }}
              onDragLeave={() => setIsDragging2(false)}
              onDrop={(e) => handleDrop(e, setContextFile, setIsDragging2)}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging2 ? "border-black bg-gray-50" : "border-gray-300"
              }`}
            >
              {contextFile ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                  <p className="text-sm">{contextFile}</p>
                  <p className="text-xs text-muted-foreground">File uploaded successfully</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm">Drag context JSON file here</p>
                  <p className="text-xs text-muted-foreground">or</p>
                  <button
                    onClick={() => handleFileSelect(setContextFile)}
                    className="px-5 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
                  >
                    Select File
                  </button>
                </div>
              )}
            </div>
            {contextFile && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={advanceStep}
                  className="px-5 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review & Validate */}
        {currentStep === 3 && (
          <div>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3>{proposalTitle}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Generated from: Playing Video Games During the COVI 19 and Well Being (1)
                </p>
              </div>
              <button
                onClick={() => setIsAwarded(!isAwarded)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                  isAwarded
                    ? "bg-green-600 text-white"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                <Award className="w-4 h-4" />
                {isAwarded ? "Awarded" : "Mark as Awarded"}
              </button>
            </div>

            {/* Confidence Score */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 mt-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Overall Proposal Confidence</p>
                  <p className="text-2xl text-red-600 mt-1">0%</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-8">
                    <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: "0%" }} />
                    </div>
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Target: 75%+</p>
            </div>

            {/* Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border border-border rounded-lg p-4">
                <h4>Proposal Sections</h4>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p className="text-xs italic">No sections generated yet</p>
                </div>
              </div>
              <div className="border border-border rounded-lg p-4 flex items-center justify-center text-muted-foreground text-sm">
                Select a section to view details
              </div>
            </div>

            {/* Collaborators sidebar inline */}
            <div className="border border-border rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <h4>Collaborators</h4>
                </div>
                <button className="flex items-center gap-1.5 text-sm text-foreground hover:bg-accent px-2 py-1 rounded transition-colors">
                  <UserPlus className="w-3.5 h-3.5" />
                  Add User
                </button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-black text-white rounded-md flex items-center justify-center text-xs">B</div>
                  <div>
                    <p className="text-sm">bsransom</p>
                    <p className="text-xs text-muted-foreground">bsransom@uci.edu</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 border border-border rounded">admin</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button className="px-5 py-2 border border-border rounded-md text-sm hover:bg-accent transition-colors">
                Cancel
              </button>
              <button
                onClick={advanceStep}
                className="px-5 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
              >
                Save Proposal
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Execution Plan */}
        {currentStep === 4 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="mb-2">Proposal Awarded</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Project has been created and added to the project management dashboard.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/projects")}
                className="px-6 py-2.5 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
              >
                Go to Project Management
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-6 py-2.5 border border-border rounded-md text-sm hover:bg-accent transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}