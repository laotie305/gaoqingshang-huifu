"use client";
/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle,
  Briefcase,
  HeartCrack,
  Heart,
  Sparkles,
  Smile,
  Users,
  Sun,
  Moon,
  HelpCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  User,
  Bot,
  ChevronRight,
  ChevronLeft,
  Info,
  X,
  Edit3,
  MessageSquare,
  AlertCircle,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { defaultScenarios, Scenario } from "@/lib/scenarios";

// Map icon string names to Lucide icons
const IconMap: Record<string, any> = {
  MessageCircle,
  Briefcase,
  HeartCrack,
  Heart,
  Sparkles,
  Smile,
  Users,
  MessageSquare
};



interface ChatTurn {
  id: string;
  partner: string;
  reply: string;
  style: "gentle" | "high_eq" | "concise" | "custom";
  scenario: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  dialogHistory: ChatTurn[];
  suggestions: {
    matched_scenario: string;
    gentle: string;
    high_eq: string;
    concise: string;
    isDemo?: boolean;
  } | null;
  inputText: string;
  selectedScenarioId: string;
  updatedAt: string;
  background?: string;
  partnerRoleType?: string;
  partnerRoleName?: string;
  myRoleName?: string;
  isSetupComplete?: boolean;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [scenariosList, setScenariosList] = useState<Scenario[]>(defaultScenarios);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("auto");
  const [dialogHistory, setDialogHistory] = useState<ChatTurn[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Background & Character Setup State
  const [background, setBackground] = useState("");
  const [partnerRoleType, setPartnerRoleType] = useState(""); // friend, colleague, partner, relative, customer, custom
  const [partnerRoleName, setPartnerRoleName] = useState("");
  const [myRoleName, setMyRoleName] = useState("");
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isEditingSetup, setIsEditingSetup] = useState(false);
  
  // Suggestion state
  const [suggestions, setSuggestions] = useState<{
    matched_scenario: string;
    gentle: string;
    high_eq: string;
    concise: string;
    isDemo?: boolean;
  } | null>(null);

  // Session directory state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"scenarios" | "dialogues">("scenarios");
  const [mobileChatViewActive, setMobileChatViewActive] = useState(false);

  // Settings & UI state
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [copiedStyle, setCopiedStyle] = useState<string | null>(null);
  const [apiKeyWarning, setApiKeyWarning] = useState(false);
  const [mobileTab, setMobileTab] = useState<"presets" | "chat">("presets");

  // Create Custom Scenario Form state
  const [showAddScenarioForm, setShowAddScenarioForm] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioDesc, setNewScenarioDesc] = useState("");
  const [newScenarioPreset, setNewScenarioPreset] = useState("");
  const [smartGeneratePresets, setSmartGeneratePresets] = useState(true);
  const [isGeneratingPresets, setIsGeneratingPresets] = useState(false);

  // Create Custom Preset Phrase state
  const [newPresetText, setNewPresetText] = useState("");
  const [showAddPresetForm, setShowAddPresetForm] = useState(false);

  // Inline edit chosen response state
  const [editingStyle, setEditingStyle] = useState<"gentle" | "high_eq" | "concise" | null>(null);
  const [editedText, setEditedText] = useState("");

  // Custom confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const historyEndRef = useRef<HTMLDivElement>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    setMounted(true);
    
    // Theme
    const savedTheme = localStorage.getItem("eq_reply_theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    // Guide
    const savedGuide = localStorage.getItem("eq_reply_guide_seen");
    if (savedGuide === "true") {
      setShowGuide(false);
    }

    // Scenarios
    const savedScenarios = localStorage.getItem("eq_reply_scenarios_v1");
    if (savedScenarios) {
      try {
        setScenariosList(JSON.parse(savedScenarios));
      } catch (e) {
        console.error("加载自定义场景失败", e);
      }
    }

    // Load sessions (with backup of old legacy history)
    const savedSessions = localStorage.getItem("eq_reply_sessions_v2");
    let loadedSessions: ChatSession[] = [];
    if (savedSessions) {
      try {
        loadedSessions = JSON.parse(savedSessions);
      } catch (e) {
        console.error("加载对话历史目录失败", e);
      }
    }

    if (loadedSessions.length === 0) {
      // Try to recover from old single dialogHistory
      const savedHistory = localStorage.getItem("eq_reply_history_v1");
      let legacyHistoryParsed: ChatTurn[] = [];
      if (savedHistory) {
        try {
          legacyHistoryParsed = JSON.parse(savedHistory);
        } catch (e) {
          // ignore
        }
      }

      if (legacyHistoryParsed.length > 0) {
        loadedSessions = [{
          id: "session_legacy",
          title: legacyHistoryParsed[0].partner.length > 15 
            ? legacyHistoryParsed[0].partner.substring(0, 15) + "..." 
            : legacyHistoryParsed[0].partner,
          dialogHistory: legacyHistoryParsed,
          suggestions: null,
          inputText: "",
          selectedScenarioId: "auto",
          updatedAt: new Date().toISOString(),
          background: "",
          partnerRoleType: "",
          partnerRoleName: "",
          myRoleName: "",
          isSetupComplete: true
        }];
      } else {
        loadedSessions = [{
          id: "session_init",
          title: "全新对话",
          dialogHistory: [],
          suggestions: null,
          inputText: "",
          selectedScenarioId: "auto",
          updatedAt: new Date().toISOString(),
          background: "",
          partnerRoleType: "",
          partnerRoleName: "",
          myRoleName: "",
          isSetupComplete: false
        }];
      }
    }

    setSessions(loadedSessions);
    const firstSession = loadedSessions[0];
    setActiveSessionId(firstSession.id);
    setDialogHistory(firstSession.dialogHistory || []);
    setSuggestions(firstSession.suggestions || null);
    setInputText(firstSession.inputText || "");
    setSelectedScenarioId(firstSession.selectedScenarioId || "auto");

    // Set background and role states
    setBackground(firstSession.background || "");
    setPartnerRoleType(firstSession.partnerRoleType || "");
    setPartnerRoleName(firstSession.partnerRoleName || "");
    setMyRoleName(firstSession.myRoleName || "");
    setIsSetupComplete(firstSession.isSetupComplete !== undefined ? !!firstSession.isSetupComplete : (firstSession.dialogHistory?.length > 0));
    setIsEditingSetup(!firstSession.isSetupComplete && firstSession.dialogHistory?.length === 0);

    // Check if API key is set by making a silent inquiry to see if Demo Mode is needed
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "TEST_API_KEY_EXISTENCE" })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.isDemo) {
          setApiKeyWarning(true);
        }
      })
      .catch(() => {
        setApiKeyWarning(true);
      });
  }, []);

  // Sync state to localStorage
  const saveScenarios = (newList: Scenario[]) => {
    setScenariosList(newList);
    localStorage.setItem("eq_reply_scenarios_v1", JSON.stringify(newList));
  };

  const saveHistory = (newHistory: ChatTurn[]) => {
    setDialogHistory(newHistory);
  };

  // Synchronize active states back to the sessions array and localStorage
  useEffect(() => {
    if (!mounted || !activeSessionId) return;
    
    setSessions(prevSessions => {
      const currentSession = prevSessions.find(s => s.id === activeSessionId);
      if (!currentSession) return prevSessions;
      
      const isHistorySame = JSON.stringify(currentSession.dialogHistory) === JSON.stringify(dialogHistory);
      const isSuggestionsSame = JSON.stringify(currentSession.suggestions) === JSON.stringify(suggestions);
      const isInputSame = currentSession.inputText === inputText;
      const isScenarioSame = currentSession.selectedScenarioId === selectedScenarioId;
      const isBackgroundSame = currentSession.background === background;
      const isPartnerRoleTypeSame = currentSession.partnerRoleType === partnerRoleType;
      const isPartnerRoleNameSame = currentSession.partnerRoleName === partnerRoleName;
      const isMyRoleNameSame = currentSession.myRoleName === myRoleName;
      const isSetupCompleteSame = currentSession.isSetupComplete === isSetupComplete;
      
      if (
        isHistorySame && 
        isSuggestionsSame && 
        isInputSame && 
        isScenarioSame && 
        isBackgroundSame && 
        isPartnerRoleTypeSame && 
        isPartnerRoleNameSame && 
        isMyRoleNameSame && 
        isSetupCompleteSame
      ) {
        return prevSessions;
      }
      
      const updated = prevSessions.map(s => {
        if (s.id === activeSessionId) {
          let title = s.title;
          if (dialogHistory.length > 0 && (s.title === "全新对话" || s.title.startsWith("全新对话"))) {
            title = dialogHistory[0].partner;
            if (title.length > 15) {
              title = title.substring(0, 15) + "...";
            }
          } else if (partnerRoleName && (s.title === "全新对话" || s.title.startsWith("全新对话"))) {
            title = `与【${partnerRoleName}】的对话`;
          }
          return {
            ...s,
            title,
            dialogHistory,
            suggestions,
            inputText,
            selectedScenarioId,
            background,
            partnerRoleType,
            partnerRoleName,
            myRoleName,
            isSetupComplete,
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });
      
      localStorage.setItem("eq_reply_sessions_v2", JSON.stringify(updated));
      return updated;
    });
  }, [dialogHistory, suggestions, inputText, selectedScenarioId, activeSessionId, background, partnerRoleType, partnerRoleName, myRoleName, isSetupComplete, mounted]);

  // Session Helper Functions
  const handleSwitchSession = (sessionId: string) => {
    const targetSession = sessions.find(s => s.id === sessionId);
    if (targetSession) {
      setActiveSessionId(sessionId);
      setDialogHistory(targetSession.dialogHistory || []);
      setSuggestions(targetSession.suggestions || null);
      setInputText(targetSession.inputText || "");
      setSelectedScenarioId(targetSession.selectedScenarioId || "auto");
      
      // Load setup states
      setBackground(targetSession.background || "");
      setPartnerRoleType(targetSession.partnerRoleType || "");
      setPartnerRoleName(targetSession.partnerRoleName || "");
      setMyRoleName(targetSession.myRoleName || "");
      setIsSetupComplete(targetSession.isSetupComplete !== undefined ? !!targetSession.isSetupComplete : (targetSession.dialogHistory?.length > 0));
      setIsEditingSetup(!targetSession.isSetupComplete && targetSession.dialogHistory?.length === 0);
      
      setMobileChatViewActive(true); // Switch to chat viewport on mobile viewports
    }
  };

  const handleCreateSession = () => {
    const newId = "session_" + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: "全新对话",
      dialogHistory: [],
      suggestions: null,
      inputText: "",
      selectedScenarioId: "auto",
      updatedAt: new Date().toISOString(),
      background: "",
      partnerRoleType: "",
      partnerRoleName: "",
      myRoleName: "",
      isSetupComplete: false
    };
    
    const updated = [newSession, ...sessions];
    setSessions(updated);
    localStorage.setItem("eq_reply_sessions_v2", JSON.stringify(updated));
    
    setActiveSessionId(newId);
    setDialogHistory([]);
    setSuggestions(null);
    setInputText("");
    setSelectedScenarioId("auto");
    
    // Clear setup states for new session
    setBackground("");
    setPartnerRoleType("");
    setPartnerRoleName("");
    setMyRoleName("");
    setIsSetupComplete(false);
    setIsEditingSetup(true); // Setup is required first
    
    setMobileChatViewActive(true); // Automatically open chat screen on mobile
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      "删除对话目录",
      "确定要删除这个对话上下文吗？该对话的所有聊天记录和推荐回复将被永久清除。",
      () => {
        const updated = sessions.filter(s => s.id !== sessionId);
        
        if (updated.length === 0) {
          const newId = "session_" + Date.now();
          const freshSession: ChatSession = {
            id: newId,
            title: "全新对话",
            dialogHistory: [],
            suggestions: null,
            inputText: "",
            selectedScenarioId: "auto",
            updatedAt: new Date().toISOString(),
            background: "",
            partnerRoleType: "",
            partnerRoleName: "",
            myRoleName: "",
            isSetupComplete: false
          };
          updated.push(freshSession);
        }
        
        setSessions(updated);
        localStorage.setItem("eq_reply_sessions_v2", JSON.stringify(updated));
        
        if (activeSessionId === sessionId) {
          const nextActive = updated[0];
          setActiveSessionId(nextActive.id);
          setDialogHistory(nextActive.dialogHistory || []);
          setSuggestions(nextActive.suggestions || null);
          setInputText(nextActive.inputText || "");
          setSelectedScenarioId(nextActive.selectedScenarioId || "auto");
          
          setBackground(nextActive.background || "");
          setPartnerRoleType(nextActive.partnerRoleType || "");
          setPartnerRoleName(nextActive.partnerRoleName || "");
          setMyRoleName(nextActive.myRoleName || "");
          setIsSetupComplete(!!nextActive.isSetupComplete);
          setIsEditingSetup(!nextActive.isSetupComplete);
        }
      }
    );
  };

  // Scroll to bottom of history
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [dialogHistory, suggestions]);

  // Scroll window to suggestions panel when suggestions load
  useEffect(() => {
    if (suggestions) {
      setTimeout(() => {
        const panel = document.getElementById("suggestions-output-panel");
        if (panel) {
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 250);
    }
  }, [suggestions]);

  // Handle dark mode toggle
  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("eq_reply_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("eq_reply_theme", "light");
    }
  };

  // Handle close guide
  const dismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem("eq_reply_guide_seen", "true");
  };

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStyle(label);
    setTimeout(() => setCopiedStyle(null), 2000);
  };

  // Get current active scenario
  const activeScenario = scenariosList.find(s => s.id === selectedScenarioId);

  // Add custom scenario
  const handleAddScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;

    setIsGeneratingPresets(true);
    let initialPresets: string[] = [];
    if (newScenarioPreset.trim()) {
      initialPresets.push(newScenarioPreset.trim());
    }

    if (smartGeneratePresets) {
      try {
        const res = await fetch("/api/generate-presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newScenarioName.trim(),
            description: newScenarioDesc.trim()
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.presets)) {
            const combined = [...initialPresets, ...data.presets];
            // Unique elements
            initialPresets = Array.from(new Set(combined));
          }
        }
      } catch (err) {
        console.error("Failed to generate presets:", err);
      }
    }

    setIsGeneratingPresets(false);
    const newId = "custom_" + Date.now();
    const newSec: Scenario = {
      id: newId,
      name: newScenarioName.trim(),
      icon: "MessageSquare",
      description: newScenarioDesc.trim() || "自定义回话场景",
      presets: initialPresets,
      isCustom: true
    };

    const updated = [...scenariosList, newSec];
    saveScenarios(updated);
    setSelectedScenarioId(newId);

    // Reset Form
    setNewScenarioName("");
    setNewScenarioDesc("");
    setNewScenarioPreset("");
    setShowAddScenarioForm(false);
  };

  // Delete custom scenario
  const handleDeleteScenario = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      "删除自定义场景",
      "确定要删除这个自定义场景吗？",
      () => {
        const updated = scenariosList.filter(s => s.id !== id);
        saveScenarios(updated);
        if (selectedScenarioId === id) {
          setSelectedScenarioId("auto");
        }
      }
    );
  };

  // Add preset phrase to currently active scenario
  const handleAddPresetPhrase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetText.trim() || !selectedScenarioId || selectedScenarioId === "auto") return;

    const updated = scenariosList.map(s => {
      if (s.id === selectedScenarioId) {
        return {
          ...s,
          presets: [...s.presets, newPresetText.trim()]
        };
      }
      return s;
    });

    saveScenarios(updated);
    setNewPresetText("");
    setShowAddPresetForm(false);
  };

  // Delete preset phrase from active scenario
  const handleDeletePreset = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedScenarioId || selectedScenarioId === "auto") return;

    const updated = scenariosList.map(s => {
      if (s.id === selectedScenarioId) {
        const copyPresets = [...s.presets];
        copyPresets.splice(index, 1);
        return {
          ...s,
          presets: copyPresets
        };
      }
      return s;
    });

    saveScenarios(updated);
  };

  // Trigger generator
  const handleGenerate = async (textOverride?: string) => {
    const textToUse = textOverride !== undefined ? textOverride : inputText;
    if (!textToUse.trim()) {
      setErrorMsg("请输入对方的原话");
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);
    setSuggestions(null);
    if (activeTab === "scenarios") {
      setActiveTab("dialogues");
    }
    setMobileChatViewActive(true); // Auto-switch to dialogues view on mobile so user sees the progress spinner

    try {
      const customScenarioNames = scenariosList.filter(s => s.isCustom).map(s => s.name);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToUse,
          history: dialogHistory,
          selectedScenario: activeScenario ? activeScenario.name : "自动匹配",
          customScenarios: customScenarioNames,
          background,
          partnerRoleType,
          partnerRoleName,
          myRoleName
        })
      });

      if (!res.ok) {
        throw new Error("生成失败，请重试");
      }

      const data = await res.json();
      setSuggestions(data);
    } catch (e: any) {
      setErrorMsg(e.message || "请求失败，请检查网络或配置");
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy suggestion and adopt reply
  const handleCopyAndAdopt = (text: string, styleKey: "gentle" | "high_eq" | "concise") => {
    navigator.clipboard.writeText(text);
    setCopiedStyle(styleKey);
    setTimeout(() => setCopiedStyle(null), 2000);
    handleAdoptReply(styleKey, text);
  };

  // Select style response to reply and move to next round
  const handleAdoptReply = (styleKey: "gentle" | "high_eq" | "concise", text: string) => {
    const newTurn: ChatTurn = {
      id: "turn_" + Date.now(),
      partner: inputText,
      reply: text,
      style: styleKey,
      scenario: suggestions?.matched_scenario || activeScenario?.name || "自动匹配",
      timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
    };

    saveHistory([...dialogHistory, newTurn]);
    
    // Clear suggestions and input for the next round of user input!
    setInputText("");
    setSuggestions(null);
    setEditingStyle(null);
  };

  // Open inline editor for a suggestion before adopting
  const startEditingSuggestion = (styleKey: "gentle" | "high_eq" | "concise", text: string) => {
    setEditingStyle(styleKey);
    setEditedText(text);
  };

  // Save edited suggestion and adopt
  const handleSaveAndAdopt = (styleKey: "gentle" | "high_eq" | "concise") => {
    if (!editedText.trim()) return;
    handleAdoptReply(styleKey, editedText.trim());
  };

  // Clear Chat History
  const handleClearHistory = () => {
    triggerConfirm(
      "清空聊天上下文",
      "确定要清空当前的聊天上下文吗？这将开始一轮全新的对话。",
      () => {
        saveHistory([]);
        setSuggestions(null);
        setInputText("");
      }
    );
  };

  // Delete specific dialogue round
  const handleDeleteTurn = (turnId: string) => {
    triggerConfirm(
      "删除对话记录",
      "确定要删除这轮对话记录吗？",
      () => {
        const updated = dialogHistory.filter(turn => turn.id !== turnId);
        saveHistory(updated);
      }
    );
  };

  return (
    <div id="app-root-container" className={cn("min-h-screen transition-all duration-500 font-sans pb-12", isDarkMode ? "bg-[#0B132B] text-slate-100" : "bg-[#F5ECD7] text-[#112140]")}>
      
      {/* Header */}
      <header id="app-header" className={cn("sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-300", isDarkMode ? "border-[#ebd29c]/15 bg-[#0B132B]/85" : "border-[#112140]/10 bg-[#F5ECD7]/85")}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div id="brand-container" className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-xl border transition-all shadow-md", isDarkMode ? "bg-[#13233F] border-[#ebd29c]/30 text-[#ebd29c]" : "bg-[#FFFBF0] border-[#112140]/20 text-[#112140]")}>
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className={cn("text-base sm:text-lg font-black tracking-widest uppercase font-mono", isDarkMode ? "text-[#ebd29c]" : "text-[#112140]")}>
                AGNES WATCHMAKER
              </h1>
              <p className={cn("text-[9px] sm:text-[10px] font-mono tracking-widest uppercase font-semibold opacity-80", isDarkMode ? "text-slate-400" : "text-[#112140]/75")}>
                Precision EQ Reply Assistant / 匠心高情商场景回话
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="guide-toggle-btn"
              onClick={() => setShowGuide(!showGuide)}
              className={cn(
                "p-2 rounded-xl border transition-all duration-200 shadow-sm",
                showGuide 
                  ? (isDarkMode ? "bg-[#ebd29c] border-[#ebd29c] text-[#112140] font-bold" : "bg-[#112140] border-[#112140] text-[#ebd29c] font-bold")
                  : (isDarkMode ? "text-[#ebd29c]/80 border-[#ebd29c]/15 hover:bg-[#13233F]" : "text-[#112140]/80 border-[#112140]/10 hover:bg-[#FFFBF0]")
              )}
              title="使用指南"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              id="theme-toggle-btn"
              onClick={toggleDarkMode}
              className={cn("p-2 rounded-xl border transition-all duration-200 shadow-sm", isDarkMode ? "text-[#ebd29c]/80 border-[#ebd29c]/15 hover:bg-[#13233F]" : "text-[#112140]/80 border-[#112140]/10 hover:bg-[#FFFBF0]")}
              title={isDarkMode ? "浅色奢华沙龙" : "深色皇家海军"}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-zinc-700" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6">
        
        {/* Module Switcher (Tabs) */}
        <div className={cn("flex p-1.5 rounded-2xl mb-6 border max-w-md mx-auto transition-all shadow-md gap-1", isDarkMode ? "bg-[#13233F] border-[#ebd29c]/15" : "bg-[#FFFBF0] border-[#112140]/10")}>
          <button
            onClick={() => setActiveTab("scenarios")}
            className={cn(
              "flex-1 py-2 px-3 text-xs font-black tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 font-mono uppercase",
              activeTab === "scenarios"
                ? (isDarkMode ? "bg-[#ebd29c] text-[#112140] shadow-md" : "bg-[#112140] text-[#ebd29c] shadow-md")
                : (isDarkMode ? "text-[#ebd29c]/60 hover:text-[#ebd29c]" : "text-slate-500 hover:text-[#112140]")
            )}
          >
            <Bot className="w-4 h-4" />
            ENGINE / 回话场景库
          </button>
          <button
            onClick={() => {
              setActiveTab("dialogues");
              setMobileChatViewActive(false);
            }}
            className={cn(
              "flex-1 py-2 px-3 text-xs font-black tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 font-mono uppercase relative",
              activeTab === "dialogues"
                ? (isDarkMode ? "bg-[#ebd29c] text-[#112140] shadow-md" : "bg-[#112140] text-[#ebd29c] shadow-md")
                : (isDarkMode ? "text-[#ebd29c]/60 hover:text-[#ebd29c]" : "text-slate-500 hover:text-[#112140]")
            )}
          >
            <MessageCircle className="w-4 h-4" />
            WORKSPACE / 智能回话区
            {sessions.some(s => s.dialogHistory.length > 0) && (
              <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>
        
        {/* Onboarding Guide Banner */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              id="onboarding-guide-banner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn("mb-6 p-5 rounded-[24px] border relative shadow-xl transition-all", isDarkMode ? "bg-[#13233F] border-[#ebd29c]/15 text-slate-100" : "bg-[#FFFBF0] border-[#112140]/15 text-[#112140]")}
            >
              <button
                onClick={dismissGuide}
                className={cn("absolute top-4 right-4 transition-colors", isDarkMode ? "text-[#ebd29c]/50 hover:text-[#ebd29c]" : "text-[#112140]/40 hover:text-[#112140]")}
                title="关闭指南"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex gap-4">
                <div className={cn("p-3 rounded-xl border shadow-inner shrink-0 hidden sm:block", isDarkMode ? "bg-[#0B132B] border-[#ebd29c]/20 text-[#ebd29c]" : "bg-[#F5ECD7] border-[#112140]/20 text-[#112140]")}>
                  <Info className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className={cn("text-xs sm:text-sm font-black font-mono tracking-widest uppercase mb-3 flex items-center gap-1.5", isDarkMode ? "text-[#ebd29c]" : "text-[#112140]")}>
                    ⚙️ ENGINE OPERATING MANUAL / 回话引擎说明书
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1">
                      <p className={cn("font-bold uppercase tracking-wider", isDarkMode ? "text-[#ebd29c]" : "text-[#112140]")}>1. 选定沟通表盘</p>
                      <p className="opacity-80">在左侧栏挑选日常、职场或吵架等预置情境，如高级制表一样精确对齐沟通底色。</p>
                    </div>
                    <div className="space-y-1">
                      <p className={cn("font-bold uppercase tracking-wider", isDarkMode ? "text-[#ebd29c]" : "text-[#112140]")}>2. 载入对方原话</p>
                      <p className="opacity-80">点击场景内部的“预置话术”气泡，把沟通细节填装进右侧的工作区中。</p>
                    </div>
                    <div className="space-y-1">
                      <p className={cn("font-bold uppercase tracking-wider", isDarkMode ? "text-[#ebd29c]" : "text-[#112140]")}>3. 齿轮啮合解析</p>
                      <p className="opacity-80">点击下方金黄色的“匹配并生成”，系统开始打磨「温和」、「高情商」与「简洁」风格。</p>
                    </div>
                    <div className="space-y-1">
                      <p className={cn("font-bold uppercase tracking-wider", isDarkMode ? "text-[#ebd29c]" : "text-[#112140]")}>4. 运转多轮齿合</p>
                      <p className="opacity-80">点击满意回复下方的“采用回复”将其压入核心，即可准备应对下一轮博弈。</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Warning if running in Demo Mode */}
        {apiKeyWarning && (
          <div id="api-warning-banner" className={cn("mb-6 p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 shadow-md transition-all", isDarkMode ? "bg-[#13233F]/40 border-rose-500/20 text-[#ebd29c]" : "bg-rose-50/50 border-rose-500/10 text-[#112140]")}>
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-extrabold uppercase tracking-widest font-mono">⚠️ OFFLINE LOCAL STANDALONE / 离线打磨模式 (NO API KEY)</p>
              <p className="mt-1 opacity-80 leading-relaxed text-xs">
                当前运行在离线高拟真话术精装版。系统采用精密的本地深度匹配算法，依然为您提供场景匹配、多轮对话和自定义场景定制。若要激活云端智能 Agnes AI 实时自动应答，请在项目根目录下 <code className="px-1.5 py-0.5 bg-black/20 text-red-400 rounded font-mono">.env</code> 写入 <code className="font-mono text-rose-400">AGNES_API_KEY</code>。
              </p>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div id="main-grid-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* MODULE 1: Scenarios & Presets */}
          {activeTab === "scenarios" && (
            <>
              {/* LEFT COLUMN: Scenario Manager */}
              <div id="left-sidebar-panel" className="lg:col-span-5 space-y-6">
                
                {/* Scenarios Panel */}
                <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                      <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50">场景选择</h2>
                    </div>
                    <button
                      id="add-scenario-trigger"
                      onClick={() => setShowAddScenarioForm(!showAddScenarioForm)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      新增场景
                    </button>
                  </div>

                  {/* Add Scenario Form (Collapsible) */}
                  <AnimatePresence>
                    {showAddScenarioForm && (
                      <motion.form
                        id="add-scenario-form-container"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handleAddScenario}
                        className="overflow-hidden border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl p-3.5 mb-4 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-3"
                      >
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-zinc-500 dark:text-zinc-400">场景名称 *</label>
                          <input
                            type="text"
                            placeholder="例如：相亲聊天、亲友催婚"
                            required
                            disabled={isGeneratingPresets}
                            value={newScenarioName}
                            onChange={(e) => setNewScenarioName(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-60"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-zinc-500 dark:text-zinc-400">场景说明</label>
                          <input
                            type="text"
                            placeholder="简述如何应对此场景下的沟通"
                            disabled={isGeneratingPresets}
                            value={newScenarioDesc}
                            onChange={(e) => setNewScenarioDesc(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-60"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1 text-zinc-500 dark:text-zinc-400">首个对方原话 (可选)</label>
                          <input
                            type="text"
                            placeholder="填入一句话用于快速测试"
                            disabled={isGeneratingPresets}
                            value={newScenarioPreset}
                            onChange={(e) => setNewScenarioPreset(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-60"
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="smart-generate-presets-checkbox"
                            disabled={isGeneratingPresets}
                            checked={smartGeneratePresets}
                            onChange={(e) => setSmartGeneratePresets(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-400 cursor-pointer disabled:opacity-60"
                          />
                          <label
                            htmlFor="smart-generate-presets-checkbox"
                            className="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none font-medium flex items-center gap-1 disabled:opacity-60"
                          >
                            ✨ 智能自动生成配套快捷话术 (基于 AI)
                          </label>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            disabled={isGeneratingPresets}
                            onClick={() => setShowAddScenarioForm(false)}
                            className="px-2.5 py-1 text-xs font-medium text-zinc-500 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                          >
                            取消
                          </button>
                          <button
                            type="submit"
                            disabled={isGeneratingPresets}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                          >
                            {isGeneratingPresets ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                智能生成中...
                              </>
                            ) : (
                              "保存"
                            )}
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Scenarios List */}
                  <div id="scenario-list-wrapper" className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {/* Auto Match Item */}
                    <button
                      id="scenario-item-auto"
                      onClick={() => setSelectedScenarioId("auto")}
                      className={cn(
                        "w-full text-left p-3 rounded-xl transition-all duration-200 border flex items-start gap-3",
                        selectedScenarioId === "auto"
                          ? "bg-zinc-100/80 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                          : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400"
                      )}
                    >
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                          ✨ 智能自动匹配
                        </p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-1">
                          根据您输入的对方原话，自动判断场景并调配专属回复
                        </p>
                      </div>
                    </button>

                    {/* Built-in and Custom items */}
                    {scenariosList.map((scenario) => {
                      const IconComponent = IconMap[scenario.icon] || MessageSquare;
                      const isSelected = selectedScenarioId === scenario.id;
                      return (
                        <div
                          key={scenario.id}
                          id={`scenario-item-${scenario.id}`}
                          onClick={() => setSelectedScenarioId(scenario.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedScenarioId(scenario.id);
                            }
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-xl transition-all duration-200 border flex items-start gap-3 relative group cursor-pointer focus:outline-none",
                            isSelected
                              ? "bg-zinc-100/80 dark:bg-zinc-800/40 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                              : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          <div className={cn(
                            "p-2 rounded-lg shrink-0 transition-colors",
                            isSelected
                              ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                              : "bg-zinc-100 dark:bg-zinc-850 text-zinc-500 dark:text-zinc-400"
                          )}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="pr-6 flex-1">
                            <p className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100">
                              {scenario.name}
                              {scenario.isCustom && (
                                <span className="text-[9px] px-1 py-0.2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-md">
                                  自定义
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 line-clamp-1">
                              {scenario.description}
                            </p>
                          </div>

                          {/* Delete Custom Button */}
                          {scenario.isCustom && (
                            <button
                              onClick={(e) => handleDeleteScenario(scenario.id, e)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150"
                              title="删除场景"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Presets Panel */}
              <div id="presets-sidebar-panel" className="lg:col-span-7 space-y-6">
                {selectedScenarioId !== "auto" && activeScenario ? (
                  <div id="presets-panel" className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-150 dark:border-zinc-850">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                        💡 【{activeScenario.name}】快捷话术库
                      </h3>
                      <button
                        id="add-preset-trigger"
                        onClick={() => setShowAddPresetForm(!showAddPresetForm)}
                        className="text-xs font-semibold text-zinc-650 dark:text-zinc-355 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        添加快捷话术
                      </button>
                    </div>

                    {/* Add Preset Form */}
                    <AnimatePresence>
                      {showAddPresetForm && (
                        <motion.form
                          id="add-preset-form-container"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          onSubmit={handleAddPresetPhrase}
                          className="overflow-hidden border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl p-3.5 mb-4 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-2"
                        >
                          <input
                            type="text"
                            placeholder="输入你常遇到的对方的原话..."
                            required
                            value={newPresetText}
                            onChange={(e) => setNewPresetText(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowAddPresetForm(false)}
                              className="px-2.5 py-1 text-xs text-zinc-500 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              取消
                            </button>
                            <button
                              type="submit"
                              className="px-2.5 py-1 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded"
                            >
                              添加
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Presets List */}
                    {activeScenario.presets.length === 0 ? (
                      <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 italic py-8 text-center bg-zinc-50/30 dark:bg-[#18181b]/10 rounded-xl">
                        此场景暂无预置话术，点击右上角添加。
                      </p>
                    ) : (
                      <div id="presets-list-wrapper" className="space-y-2.5 pr-1 max-h-[480px] overflow-y-auto">
                        {activeScenario.presets.map((preset, idx) => (
                          <div
                            key={idx}
                            id={`preset-item-${idx}`}
                            onClick={() => {
                              if (!isSetupComplete) {
                                setActiveTab("dialogues");
                                setMobileChatViewActive(true);
                                setIsEditingSetup(true);
                                setErrorMsg("请先设定对方的角色与对话背景描述，然后再载入快捷话术！");
                                return;
                              }
                              setInputText(preset);
                              setErrorMsg(null);
                              setActiveTab("dialogues");
                              setMobileChatViewActive(true);
                              handleGenerate(preset);
                            }}
                            className="group w-full text-left p-3.5 rounded-xl border border-zinc-150 dark:border-zinc-800 bg-zinc-50/30 dark:bg-[#18181b]/30 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 hover:border-zinc-350 cursor-pointer transition-all flex items-start justify-between gap-2 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="line-clamp-3 leading-relaxed">{preset}</span>
                            <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerConfirm(
                                    "删除预置话术",
                                    "确定删除该快捷话术吗？",
                                    () => handleDeletePreset(idx, e)
                                  );
                                }}
                                className="p-1.5 text-zinc-400 hover:text-red-500 rounded"
                                title="删除预置"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-4 leading-relaxed">
                      * 提示：点击任意快捷话术，系统将为您自动切换至智能对话框，并载入此句快速智能回话。
                    </p>
                  </div>
                ) : (
                  /* Auto Match Explanation Guide Card */
                  <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-6 shadow-sm flex flex-col items-center justify-center text-center min-h-[300px] space-y-4">
                    <div className="p-4 rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-500 border border-zinc-100 dark:border-zinc-850">
                      <Sparkles className="w-8 h-8 text-zinc-650 dark:text-zinc-350 animate-pulse" />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200">✨ 智能自动匹配模式</h3>
                      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        当前选择了“智能自动匹配”。在此模式下，您无需手动选择特定场景，直接输入对方的原话，AI 将通过语义大模型自动为您分析其沟通底色、心理博弈并精确匹配合适的快捷话术风格。
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                        💡 提示：您可以点击左侧列表选择“日常沟通”、“职场加班”或“缓和吵架”等定制场景，来查看和编辑专属的快捷预置话术。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* LEFT COLUMN: Dialogue Sessions Directory (对话目录) */}
          {activeTab === "dialogues" && (
            <div id="dialogue-directory-sidebar" className={cn("lg:col-span-4 space-y-4", mobileChatViewActive ? "hidden lg:block" : "block")}>
              <div className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-150 dark:border-zinc-850">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                    <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50">对话目录</h2>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full font-mono font-medium">
                    {sessions.length} 个对话
                  </span>
                </div>

                {/* Create New Session Button */}
                <button
                  onClick={handleCreateSession}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-750 hover:border-zinc-500 dark:hover:border-zinc-550 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 bg-zinc-50/50 dark:bg-zinc-900/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                >
                  <Plus className="w-4 h-4" />
                  新建对话目录
                </button>

                {/* Sessions List */}
                <div id="sessions-list-wrapper" className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic text-center py-6">
                      暂无对话目录，请点击上方创建。
                    </p>
                  ) : (
                    sessions.map((session) => {
                      const isSelected = session.id === activeSessionId;
                      const roundCount = session.dialogHistory.length;
                      return (
                        <div
                          key={session.id}
                          onClick={() => handleSwitchSession(session.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-xl transition-all duration-200 border flex items-start justify-between gap-3 relative group cursor-pointer",
                            isSelected
                              ? "bg-zinc-100/80 dark:bg-zinc-800/45 border-zinc-300 dark:border-zinc-750 text-zinc-900 dark:text-zinc-100 font-medium"
                              : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 bg-zinc-50/20 dark:bg-zinc-900/5"
                          )}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <div className={cn(
                              "p-1.5 rounded-lg shrink-0",
                              isSelected ? "bg-zinc-250 dark:bg-zinc-700 text-zinc-850 dark:text-zinc-50" : "bg-zinc-100 dark:bg-zinc-850 text-zinc-400 dark:text-zinc-500"
                            )}>
                              <MessageSquare className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate pr-2">
                                {session.title || "全新对话"}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                                <span>{roundCount} 轮对话</span>
                                <span>•</span>
                                <span>
                                  {new Date(session.updatedAt || Date.now()).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Delete Session Button */}
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-md transition-colors shrink-0 self-center opacity-60 lg:opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                            title="删除此对话"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: Chat Area & Generator Output */}
          <div id="right-chat-column" className={cn("lg:col-span-8 flex flex-col space-y-6", activeTab === "dialogues" && mobileChatViewActive ? "block" : "hidden lg:flex")}>
            
            {/* Mobile Back To Directory Tab */}
            <button
              onClick={() => setMobileChatViewActive(false)}
              className="lg:hidden self-start inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-900 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              返回对话目录
            </button>
            
            {/* Dialogue Background & Role Setup Card */}
            <div id="role-background-setup-card" className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-850">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg">
                    <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      🎭 1. 角色与背景设定
                    </h3>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      确定沟通身份与对话底色，获得极精准高情商话术
                    </p>
                  </div>
                </div>
                {isSetupComplete && !isEditingSetup && (
                  <button
                    onClick={() => setIsEditingSetup(true)}
                    className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1"
                  >
                    ✏️ 修改设定
                  </button>
                )}
              </div>

              {(!isSetupComplete || isEditingSetup) ? (
                <div className="space-y-4 animate-fadeIn">
                  {/* Role Type Buttons */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">对方角色分类</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { type: "colleague", label: "💼 职场同事", defaultName: "领导" },
                        { type: "partner", label: "❤️ 恋爱伴侣", defaultName: "宝贝" },
                        { type: "relative", label: "🏡 催婚亲戚", defaultName: "长辈" },
                        { type: "friend", label: "👥 日常朋友", defaultName: "朋友" },
                        { type: "customer", label: "🛒 刁钻客户", defaultName: "客户" },
                        { type: "custom", label: "🎭 其它自定义", defaultName: "对方" }
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => {
                            setPartnerRoleType(item.type);
                            setPartnerRoleName(item.defaultName);
                          }}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center",
                            partnerRoleType === item.type
                              ? "bg-violet-50 dark:bg-violet-950/20 border-violet-300 dark:border-violet-750 text-violet-700 dark:text-violet-300 font-semibold"
                              : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Character Names Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">对方具体称呼 / 身份</label>
                      <input
                        type="text"
                        placeholder="例如：直属领导、老妈、女朋友、刁难客户等"
                        value={partnerRoleName}
                        onChange={(e) => setPartnerRoleName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">我的具体身份</label>
                      <input
                        type="text"
                        placeholder="例如：下属、儿女、男朋友、项目经理等"
                        value={myRoleName}
                        onChange={(e) => setMyRoleName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      />
                    </div>
                  </div>

                  {/* Background Description Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">对话背景描述</label>
                    <textarea
                      rows={2}
                      placeholder="请描述对话发生时的具体背景，如：“下班前领导在群里临时加塞紧急报告，而我还有别的事要做” 或 “微信上突然被长辈问起年终奖”"
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 placeholder-zinc-400/80"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-850">
                    {isSetupComplete && (
                      <button
                        type="button"
                        onClick={() => setIsEditingSetup(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        取消修改
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (!partnerRoleName.trim()) {
                          setErrorMsg("请填写对方具体称呼 / 身份");
                          return;
                        }
                        if (!background.trim()) {
                          setErrorMsg("请填写对话背景描述");
                          return;
                        }
                        setErrorMsg(null);
                        setIsSetupComplete(true);
                        setIsEditingSetup(false);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-colors"
                    >
                      保存设定，进入对话 🔓
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-50 dark:bg-zinc-900/35 border border-zinc-150 dark:border-zinc-800/60 rounded-xl p-3 text-xs text-zinc-600 dark:text-zinc-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center flex-wrap gap-1.5">
                      <span>👥 对方：<span className="text-violet-600 dark:text-violet-400">{partnerRoleName || "对方"}</span></span>
                      {partnerRoleType && (
                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-500">
                          {partnerRoleType === "colleague" && "职场同事"}
                          {partnerRoleType === "partner" && "恋爱伴侣"}
                          {partnerRoleType === "relative" && "催婚亲戚"}
                          {partnerRoleType === "friend" && "日常朋友"}
                          {partnerRoleType === "customer" && "刁钻客户"}
                          {partnerRoleType === "custom" && "其它自定义"}
                        </span>
                      )}
                      {myRoleName && <span>| 我的身份：<span className="text-zinc-850 dark:text-zinc-100 font-semibold">{myRoleName}</span></span>}
                    </p>
                    {background && (
                      <p className="text-[11px] text-zinc-450 dark:text-zinc-500 line-clamp-1">
                        🎬 背景：{background}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                    <Check className="w-3.5 h-3.5" />
                    已锁定底色
                  </div>
                </div>
              )}
            </div>

            {/* Dialogue History Container / Setup Lock Placeholder */}
            {isSetupComplete ? (
              <div id="chat-context-card" className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-5 shadow-sm flex flex-col min-h-[380px] justify-between">
                
                {/* Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-850">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">多轮对话上下文记录</span>
                    {dialogHistory.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full font-mono">
                        {dialogHistory.length} 轮对话
                      </span>
                    )}
                  </div>
                  {dialogHistory.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors hover:underline"
                      title="清空对话"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      清空并开启新对话
                    </button>
                  )}
                </div>

                {/* Chat Viewport */}
                <div id="chat-viewport" className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[450px] min-h-[220px]">
                  {dialogHistory.length === 0 ? (
                    /* Empty state welcome card */
                    <div id="empty-chat-state" className="h-full flex flex-col items-center justify-center text-center py-6 px-4 space-y-4">
                      <div className="p-4 rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-500">
                        <MessageCircle className="w-10 h-10 animate-bounce" />
                      </div>
                      <div className="max-w-md space-y-1">
                        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">开始您的第一轮高情商对话</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                          当前沟通的角色与背景设定已就绪。在下方输入框中输入对方发给您的原话，系统会为您定制出 3 种极具沟通智慧的优质回复。
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Dialogue messages rendering */
                    <div id="dialog-history-list" className="space-y-4 px-1">
                      {dialogHistory.map((turn, index) => {
                        const styleLabel =
                          turn.style === "gentle"
                            ? "🌸 温和风格"
                            : turn.style === "high_eq"
                            ? "🔮 高情商风格"
                            : turn.style === "concise"
                            ? "⚡ 简洁风格"
                            : "✏️ 修改自定义";

                        const styleBg =
                          turn.style === "gentle"
                            ? "bg-rose-50/60 dark:bg-rose-950/10 text-rose-950 dark:text-rose-200 border-rose-100/50 dark:border-rose-950/30"
                            : turn.style === "high_eq"
                            ? "bg-violet-50/60 dark:bg-violet-950/10 text-violet-950 dark:text-violet-200 border-violet-100/50 dark:border-violet-950/30"
                            : turn.style === "concise"
                            ? "bg-zinc-50 dark:bg-zinc-900/40 text-zinc-900 dark:text-zinc-200 border-zinc-150 dark:border-zinc-800/40"
                            : "bg-zinc-100 dark:bg-zinc-900/60 text-zinc-900 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800/40";

                        return (
                          <div key={turn.id} className="space-y-3">
                            {/* Round Header */}
                            <div className="flex items-center justify-between border-b border-dashed border-zinc-100 dark:border-zinc-800 pb-1.5">
                              <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-2.5 py-0.5 rounded-full font-mono">
                                第 {index + 1} 轮对话 • {turn.scenario}
                              </span>
                              <button
                                onClick={() => handleDeleteTurn(turn.id)}
                                className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-md transition-colors"
                                title="删除此轮记录"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Partner's Word bubble (Left) */}
                            <div className="flex items-start space-x-2.5 max-w-[85%]">
                              <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 font-bold text-xs">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] text-zinc-400 font-semibold pl-1">【{partnerRoleName || "对方"}】说</p>
                                <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/55 px-3.5 py-2.5 rounded-2xl rounded-tl-none text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                                  {turn.partner}
                                </div>
                              </div>
                            </div>

                            {/* My Reply bubble (Right) */}
                            <div className="flex items-start justify-end space-x-2.5 ml-auto max-w-[85%] text-right">
                              <div className="space-y-1 text-right">
                                <p className="text-[10px] text-zinc-400 font-semibold pr-1">
                                  【{myRoleName || "我"}】 ({styleLabel})
                                </p>
                                <div className={cn("px-3.5 py-2.5 rounded-2xl rounded-tr-none text-xs sm:text-sm text-left leading-relaxed border", styleBg)}>
                                  {turn.reply}
                                </div>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0 font-bold text-xs">
                                <Bot className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Visual Anchor for Scrolling */}
                  <div ref={historyEndRef} />
                </div>

                {/* Partner Input Form Box */}
                <div id="chat-input-area" className="border-t border-zinc-150 dark:border-zinc-850 pt-4 mt-2">
                  <div className="relative">
                    <textarea
                      id="chat-textarea-input"
                      rows={3}
                      placeholder={
                        selectedScenarioId !== "auto" && activeScenario
                          ? `请输入在此【${activeScenario.name}】场景下【${partnerRoleName || "对方"}】发来的原话...`
                          : `请输入【${partnerRoleName || "对方"}】发来的原话，AI 会自动为您匹配并生成高情商回复...`
                      }
                      value={inputText}
                      onChange={(e) => {
                        setInputText(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                      className="w-full text-xs sm:text-sm p-3.5 pb-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-450 transition-all resize-none placeholder-zinc-400"
                    />

                    {/* Character counts & Clear text & Action button in textarea */}
                    <div className="absolute bottom-2.5 left-3 flex items-center space-x-2">
                      {inputText && (
                        <button
                          id="clear-input-btn"
                          onClick={() => setInputText("")}
                          className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                          title="清空内容"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span id="char-counter" className="text-[10px] text-zinc-400 font-mono font-medium">
                        {inputText.length} 字
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 right-3">
                      <button
                        id="generate-suggestion-btn"
                        onClick={() => handleGenerate()}
                        disabled={isGenerating || !inputText.trim()}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                          inputText.trim()
                            ? "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 active:scale-95 cursor-pointer shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                        )}
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            匹配中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            智能匹配并生成建议
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errorMsg}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* Setup Lock Placeholder screen */
              <div id="chat-setup-lock-card" className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-8 shadow-sm flex flex-col items-center justify-center text-center min-h-[380px] space-y-4">
                <div className="p-4 rounded-full bg-zinc-50 dark:bg-zinc-900 text-zinc-400 border border-zinc-100 dark:border-zinc-850 relative">
                  <Lock className="w-8 h-8 text-violet-500 animate-pulse" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200">
                    🔒 智能回话区暂未解锁
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    为了帮您生成最得体、最具情绪博弈精度的高情商话术，我们需要先确定沟通的【背景描述】与【角色身份设定】。
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold animate-pulse">
                    👇 请在上方完成 “1. 角色与背景设定” 后，即可解锁此区域输入内容！
                  </p>
                </div>
                {errorMsg && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorMsg}
                  </p>
                )}
              </div>
            )}

            {/* Generated Suggestions Output panel */}
            <AnimatePresence>
              {(isGenerating || suggestions) && (
                <motion.div
                  id="suggestions-output-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-5 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-150 dark:border-zinc-850 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg border border-zinc-200/50 dark:border-zinc-700/50">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50">智能回复分析结果</h3>
                        {suggestions && (
                          <p className="text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                            匹配场景模式：<span className="text-zinc-800 dark:text-zinc-200 font-semibold">【{suggestions.matched_scenario}】</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {isGenerating && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1 animate-pulse font-medium">
                        <RefreshCw className="w-3 h-3 animate-spin text-zinc-500" />
                        正在匹配多轮语义并组织高情商辞藻...
                      </span>
                    )}
                  </div>

                  {isGenerating ? (
                    /* Suggestions Skeletons */
                    <div id="suggestions-skeleton-grid" className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="border border-zinc-200/40 dark:border-zinc-800/80 rounded-xl p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/10 animate-pulse">
                          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
                          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
                          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-4/6" />
                          <div className="pt-2 flex justify-between">
                            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
                            <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : suggestions ? (
                    /* Real Suggestions rendering */
                    <div id="suggestions-cards-grid" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* STYLE 1: 温和 (Gentle) */}
                      <div id="suggestion-card-gentle" className="border border-rose-100 dark:border-rose-950/30 rounded-xl p-4 flex flex-col justify-between bg-rose-50/5 dark:bg-[#121214] relative group">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/20 px-2 py-0.5 rounded-full">
                              🌸 温和风格 (Gentle)
                            </span>
                            <span className="text-[10px] text-zinc-400">同理心、温柔、关怀</span>
                          </div>

                          {editingStyle === "gentle" ? (
                            <div className="space-y-2">
                              <textarea
                                id="edit-textarea-gentle"
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-rose-200 dark:border-rose-900 bg-white dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                                rows={4}
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  id="edit-cancel-gentle"
                                  onClick={() => setEditingStyle(null)}
                                  className="px-2 py-0.5 text-[10px] text-zinc-500 rounded hover:bg-zinc-100"
                                >
                                  取消
                                </button>
                                <button
                                  id="edit-save-gentle"
                                  onClick={() => handleSaveAndAdopt("gentle")}
                                  className="px-2 py-0.5 text-[10px] bg-rose-600 text-white rounded"
                                >
                                  保存并回复
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p id="suggestion-text-gentle" className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 min-h-[80px]">
                              {suggestions.gentle}
                            </p>
                          )}
                        </div>

                        {editingStyle !== "gentle" && (
                          <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/80 mt-3">
                            <button
                              id="copy-btn-gentle"
                              onClick={() => handleCopy(suggestions.gentle, "gentle")}
                              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                              title="复制代码"
                            >
                              {copiedStyle === "gentle" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500">已复制</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>复制</span>
                                </>
                              )}
                            </button>
                            <div className="flex items-center space-x-1">
                              <button
                                id="edit-btn-gentle"
                                onClick={() => startEditingSuggestion("gentle", suggestions.gentle)}
                                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
                                title="修改此句"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id="adopt-btn-gentle"
                                onClick={() => handleAdoptReply("gentle", suggestions.gentle)}
                                className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
                              >
                                采用回复
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* STYLE 2: 高情商 (High-EQ) */}
                      <div id="suggestion-card-high_eq" className="border border-violet-100 dark:border-violet-950/30 rounded-xl p-4 flex flex-col justify-between bg-violet-50/5 dark:bg-[#121214] relative group">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50/80 dark:bg-violet-950/20 px-2 py-0.5 rounded-full">
                              🔮 高情商风格 (EQ)
                            </span>
                            <span className="text-[10px] text-zinc-400">睿智、风趣、化解冲突</span>
                          </div>

                          {editingStyle === "high_eq" ? (
                            <div className="space-y-2">
                              <textarea
                                id="edit-textarea-high_eq"
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-violet-200 dark:border-violet-900 bg-white dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                                rows={4}
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  id="edit-cancel-high_eq"
                                  onClick={() => setEditingStyle(null)}
                                  className="px-2 py-0.5 text-[10px] text-zinc-500 rounded hover:bg-zinc-100"
                                >
                                  取消
                                </button>
                                <button
                                  id="edit-save-high_eq"
                                  onClick={() => handleSaveAndAdopt("high_eq")}
                                  className="px-2 py-0.5 text-[10px] bg-violet-600 text-white rounded"
                                >
                                  保存并回复
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p id="suggestion-text-high_eq" className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 min-h-[80px]">
                              {suggestions.high_eq}
                            </p>
                          )}
                        </div>

                        {editingStyle !== "high_eq" && (
                          <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800/80 mt-3">
                            <button
                              id="copy-btn-high_eq"
                              onClick={() => handleCopy(suggestions.high_eq, "high_eq")}
                              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                              title="复制代码"
                            >
                              {copiedStyle === "high_eq" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500">已复制</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>复制</span>
                                </>
                              )}
                            </button>
                            <div className="flex items-center space-x-1">
                              <button
                                id="edit-btn-high_eq"
                                onClick={() => startEditingSuggestion("high_eq", suggestions.high_eq)}
                                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
                                title="修改此句"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id="adopt-btn-high_eq"
                                onClick={() => handleAdoptReply("high_eq", suggestions.high_eq)}
                                className="px-2.5 py-1 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
                              >
                                采用回复
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* STYLE 3: 简洁 (Concise) */}
                      <div id="suggestion-card-concise" className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between bg-zinc-50/5 dark:bg-[#121214] relative group">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                              ⚡ 简洁风格 (Direct)
                            </span>
                            <span className="text-[10px] text-zinc-400">大方、得体、不拖泥带水</span>
                          </div>

                          {editingStyle === "concise" ? (
                            <div className="space-y-2">
                              <textarea
                                id="edit-textarea-concise"
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 focus:outline-none"
                                rows={4}
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  id="edit-cancel-concise"
                                  onClick={() => setEditingStyle(null)}
                                  className="px-2 py-0.5 text-[10px] text-zinc-500 rounded hover:bg-zinc-100"
                                >
                                  取消
                                </button>
                                <button
                                  id="edit-save-concise"
                                  onClick={() => handleSaveAndAdopt("concise")}
                                  className="px-2 py-0.5 text-[10px] bg-zinc-700 text-white rounded"
                                >
                                  保存并回复
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p id="suggestion-text-concise" className="text-xs sm:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 min-h-[80px]">
                              {suggestions.concise}
                            </p>
                          )}
                        </div>

                        {editingStyle !== "concise" && (
                          <div className="flex items-center justify-between pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 mt-3">
                            <button
                              id="copy-btn-concise"
                              onClick={() => handleCopy(suggestions.concise, "concise")}
                              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                              title="复制代码"
                            >
                              {copiedStyle === "concise" ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500">已复制</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>复制</span>
                                </>
                              )}
                            </button>
                            <div className="flex items-center space-x-1">
                              <button
                                id="edit-btn-concise"
                                onClick={() => startEditingSuggestion("concise", suggestions.concise)}
                                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
                                title="修改此句"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                id="adopt-btn-concise"
                                onClick={() => handleAdoptReply("concise", suggestions.concise)}
                                className="px-2.5 py-1 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
                              >
                                采用回复
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : null}

                  {suggestions && (
                    <div id="suggestions-tips-banner" className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 text-center text-xs text-zinc-500 leading-relaxed">
                      💡 想要开启多轮追问？点击您喜欢的回复右下角的 <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">&quot;采用回复&quot;</strong> 按钮。该回复将存入您的对话框中，并可以输入对方的下一轮原话！
                    </div>
                  )}

                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer id="app-footer" className="mt-12 py-8 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 text-center text-xs text-zinc-400 dark:text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>高情商场景回话助手 - 运用沟通心理学的高拟真语义匹配系统</p>
        </div>
      </footer>

      {/* Custom Confirmation Dialog */}
      <AnimatePresence>
        {confirmState.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#121214] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xl space-y-4 text-center sm:text-left"
            >
              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50">
                  {confirmState.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => confirmState.onConfirm()}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 text-white shadow-sm transition-colors"
                >
                  确定
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

