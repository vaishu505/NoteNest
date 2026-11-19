
import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Search, Plus, LayoutGrid, List, Star, Trash2,
  Pin, X, FileText, Menu, RotateCcw, Tag, Moon, Sun,
  Bell, CalendarClock, Clock, Download, Copy, Share2,
  Bold, Italic, Underline, List as ListIcon, ListOrdered,
  Heading1, Heading2, Undo, Redo, RemoveFormatting
} from "lucide-react";
import { jsPDF } from "jspdf";
import "./App.css";

const categories = ["Personal", "Work", "Study", "Ideas"];

const noteColors = [
  { name: "purple", label: "Lavender", color: "#EAE3FF" },
  { name: "blue", label: "Sky Blue", color: "#DDEEFF" },
  { name: "yellow", label: "Butter Yellow", color: "#FFF2CC" },
  { name: "pink", label: "Soft Pink", color: "#FFE1EC" }
];

const defaultNotes = [
  {
    id: 1,
    title: "Welcome to NoteNest",
    content: "Your thoughts, ideas and plans deserve a beautiful home. Start organizing everything here!",
    color: "purple",
    date: "Nov 19, 2026",
    pinned: true,
    category: "Personal",
    reminder: ""
  },
  {
    id: 2,
    title: "Project Ideas",
    content: "Build creative projects, explore new technologies and keep learning something new every day.",
    color: "blue",
    date: "Nov 18, 2026",
    pinned: false,
    category: "Work",
    reminder: ""
  },
  {
    id: 3,
    title: "Daily Goals",
    content: "Complete pending tasks, practice coding and spend some time learning React.",
    color: "yellow",
    date: "Nov 17, 2026",
    pinned: false,
    category: "Study",
    reminder: ""
  }
];

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : JSON.parse(saved);
  } catch {
    return fallback;
  }
}

function getToday() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatReminder(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

function getNoteTimestamp(note) {
  if (note.updatedAt) return note.updatedAt;
  const parsedDate = Date.parse(note.date || "");
  return Number.isNaN(parsedDate) ? 0 : parsedDate;
}

// Convert rich text HTML into readable plain text.
function htmlToText(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

function addPdfText(doc, text, x, y, maxWidth, lineHeight = 7) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const lines = doc.splitTextToSize(String(text || ""), maxWidth);

  lines.forEach((line) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineHeight;
  });

  return y;
}

function createNotePdf(note) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  let y = 25;

  y = addPdfText(doc, note.title || "Untitled Note", margin, y, maxWidth, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 5;

  y = addPdfText(doc, `Category: ${note.category || "Personal"}`, margin, y, maxWidth);
  y = addPdfText(doc, `Date: ${note.date || getToday()}`, margin, y, maxWidth);

  if (note.reminder) {
    y = addPdfText(doc, `Reminder: ${formatReminder(note.reminder)}`, margin, y, maxWidth);
  }

  y += 8;
  doc.setDrawColor(210);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  doc.setFontSize(12);
  y = addPdfText(doc, htmlToText(note.content || ""), margin, y, maxWidth, 7);

  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text("Created with NoteNest", margin, doc.internal.pageSize.getHeight() - 10);

  return doc;
}

function safeFileName(name) {
  return (name || "Note")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "Note";
}

function App() {
  const [notes, setNotes] = useState(() =>
    readStorage("notenest-notes", defaultNotes)
  );
  const [trash, setTrash] = useState(() =>
    readStorage("notenest-trash", [])
  );
  const [theme, setTheme] = useState(() =>
    readStorage("notenest-theme", "light")
  );
  const [viewMode, setViewMode] = useState(() =>
    readStorage("notenest-view", "grid")
  );
  const [sortOrder, setSortOrder] = useState(() =>
    readStorage("notenest-sort", "recent")
  );
  const [notificationPermission, setNotificationPermission] = useState(
    getNotificationPermission
  );
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [dismissedReminders, setDismissedReminders] = useState(() =>
    readStorage("notenest-dismissed-reminders", [])
  );

  const [activeTab, setActiveTab] = useState("All Notes");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeView, setActiveView] = useState("notes");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Personal");
  const [color, setColor] = useState("purple");
  const [reminder, setReminder] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);

  const editorRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      setNotificationPermission(getNotificationPermission());
      setCurrentTime(Date.now());
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    localStorage.setItem("notenest-notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("notenest-trash", JSON.stringify(trash));
  }, [trash]);

  useEffect(() => {
    localStorage.setItem("notenest-theme", JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("notenest-view", JSON.stringify(viewMode));
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem("notenest-sort", JSON.stringify(sortOrder));
  }, [sortOrder]);

  useEffect(() => {
    localStorage.setItem(
      "notenest-dismissed-reminders",
      JSON.stringify(dismissedReminders)
    );
  }, [dismissedReminders]);

  // Load note content into the rich text editor.
  useEffect(() => {
    if (showModal && editorRef.current) {
      editorRef.current.innerHTML = content || "";
    }
  }, [showModal, editingNoteId]);

  // RICH TEXT FORMATTING
  const formatText = (command, value = null) => {
    if (!editorRef.current) return;

    editorRef.current.focus();
    document.execCommand(command, false, value);

    setContent(editorRef.current.innerHTML);
  };

  const updateEditorContent = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Your browser does not support notifications.");
      setNotificationPermission("unsupported");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        new Notification("NoteNest notifications enabled!", {
          body: "You'll receive browser notifications when your reminders are due."
        });
      } else if (permission === "denied") {
        alert("Notifications are blocked. Please allow them in your browser site settings.");
      }
    } catch (error) {
      console.error("Notification permission error:", error);
      alert("Could not enable notifications in this browser.");
    }
  };

  useEffect(() => {
    if (
      notificationPermission !== "granted" ||
      !("Notification" in window)
    ) return;

    const notifiedReminders = readStorage("notenest-notified-reminders", []);
    const updatedNotifiedReminders = [...notifiedReminders];
    let storageChanged = false;

    notes.forEach((note) => {
      if (!note.reminder) return;

      const reminderTime = new Date(note.reminder).getTime();
      if (Number.isNaN(reminderTime) || reminderTime > currentTime) return;

      const reminderKey = `${note.id}-${note.reminder}`;
      if (updatedNotifiedReminders.includes(reminderKey)) return;

      updatedNotifiedReminders.push(reminderKey);
      storageChanged = true;

      try {
        const notification = new Notification(
          `Reminder: ${note.title || "Untitled note"}`,
          {
            body: htmlToText(note.content || "") || "You have a note reminder!",
            tag: reminderKey
          }
        );

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error("Could not display reminder:", error);
      }
    });

    if (storageChanged) {
      localStorage.setItem(
        "notenest-notified-reminders",
        JSON.stringify(updatedNotifiedReminders)
      );
    }
  }, [notes, currentTime, notificationPermission]);

  const toggleTheme = () => {
    setTheme((current) => current === "light" ? "dark" : "light");
  };

  const toggleView = () => {
    setViewMode((current) => current === "grid" ? "list" : "grid");
  };

  const dueReminders = notes.filter((note) => {
    if (!note.reminder) return false;
    const reminderTime = new Date(note.reminder).getTime();
    const reminderKey = `${note.id}-${note.reminder}`;

    return (
      !Number.isNaN(reminderTime) &&
      reminderTime <= currentTime &&
      !dismissedReminders.includes(reminderKey)
    );
  });

  const filteredNotes = notes.filter((note) => {
    const noteTitle = (note.title || "").toLowerCase();
    const noteContent = htmlToText(note.content || "").toLowerCase();
    const searchTerm = search.toLowerCase();

    const matchesSearch =
      noteTitle.includes(searchTerm) || noteContent.includes(searchTerm);

    const matchesTab =
      activeTab === "All Notes" ||
      (activeTab === "Favorites" && note.pinned);

    const matchesCategory =
      activeCategory === "All" ||
      (note.category || "Personal") === activeCategory;

    return matchesSearch && matchesTab && matchesCategory;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    switch (sortOrder) {
      case "oldest":
        return getNoteTimestamp(a) - getNoteTimestamp(b);
      case "title-asc":
        return (a.title || "").localeCompare(b.title || "");
      case "title-desc":
        return (b.title || "").localeCompare(a.title || "");
      case "recent":
      default:
        return getNoteTimestamp(b) - getNoteTimestamp(a);
    }
  });

  const filteredTrash = trash.filter((note) =>
    (note.title || "").toLowerCase().includes(search.toLowerCase()) ||
    htmlToText(note.content || "").toLowerCase().includes(search.toLowerCase())
  );

  // EXPORT ONE NOTE
  const exportNote = (note) => {
    try {
      const doc = createNotePdf(note);
      doc.save(`${safeFileName(note.title)}.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Could not export this note. Please try again.");
    }
  };

  // EXPORT ALL NOTES
  const exportAllNotes = () => {
    if (notes.length === 0) {
      alert("There are no notes to export.");
      return;
    }

    try {
      const doc = new jsPDF();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("NoteNest - All Notes", 20, 25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Exported on: ${getToday()}`, 20, 34);
      doc.text(`Total notes: ${notes.length}`, 20, 41);

      let y = 55;
      const margin = 20;
      const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;

      notes.forEach((note, index) => {
        if (y > doc.internal.pageSize.getHeight() - 45) {
          doc.addPage();
          y = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        y = addPdfText(doc, `${index + 1}. ${note.title || "Untitled Note"}`, margin, y, maxWidth, 8);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        y = addPdfText(doc, `Category: ${note.category || "Personal"} | Date: ${note.date || ""}`, margin, y, maxWidth, 6);

        if (note.reminder) {
          y = addPdfText(doc, `Reminder: ${formatReminder(note.reminder)}`, margin, y, maxWidth, 6);
        }

        doc.setFontSize(10);
        y += 2;
        y = addPdfText(doc, htmlToText(note.content || ""), margin, y, maxWidth, 6);
        y += 7;

        doc.setDrawColor(220);
        if (y < doc.internal.pageSize.getHeight() - 15) {
          doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
        }
        y += 10;
      });

      doc.save("NoteNest-All-Notes.pdf");
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Could not export your notes. Please try again.");
    }
  };

  // COPY NOTE
  const getNoteText = (note) => {
    return `${note.title || "Untitled Note"}\n\n${htmlToText(note.content || "")}\n\nCategory: ${note.category || "Personal"}\nDate: ${note.date || ""}`;
  };

  const copyNote = async (note) => {
    try {
      await navigator.clipboard.writeText(getNoteText(note));
      alert("Note copied to clipboard!");
    } catch (error) {
      console.error("Copy error:", error);
      alert("Could not copy this note. Please check your browser permissions.");
    }
  };

  // SHARE NOTE
  const shareNote = async (note) => {
    const textToShare = getNoteText(note);

    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title || "NoteNest Note",
          text: textToShare
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Share error:", error);
          alert("Could not share this note.");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(textToShare);
        alert("Sharing is not supported here. Note copied instead!");
      } catch (error) {
        console.error("Share fallback error:", error);
        alert("Sharing and copying are not supported by this browser.");
      }
    }
  };

  const openNewNote = () => {
    setEditingNoteId(null);
    setTitle("");
    setContent("");
    setColor("purple");
    setReminder("");
    setCategory(activeCategory === "All" ? "Personal" : activeCategory);
    setShowModal(true);
  };

  const openEdit = (note) => {
    setEditingNoteId(note.id);
    setTitle(note.title || "");
    setContent(note.content || "");
    setCategory(note.category || "Personal");
    setColor(note.color || "purple");
    setReminder(note.reminder || "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTitle("");
    setContent("");
    setCategory("Personal");
    setColor("purple");
    setReminder("");
    setEditingNoteId(null);
  };

  const saveNote = () => {
    const editorContent = editorRef.current?.innerHTML || content;
    const plainContent = htmlToText(editorContent).trim();

    if (!title.trim() || !plainContent) {
      alert("Please enter both a title and note content.");
      return;
    }

    if (reminder && Number.isNaN(new Date(reminder).getTime())) {
      alert("Please choose a valid reminder date and time.");
      return;
    }

    const now = Date.now();

    if (editingNoteId !== null) {
      setNotes((previousNotes) =>
        previousNotes.map((note) =>
          note.id === editingNoteId
            ? {
                ...note,
                title: title.trim(),
                content: editorContent,
                category,
                color,
                reminder,
                date: getToday(),
                updatedAt: now
              }
            : note
        )
      );
    } else {
      const newNote = {
        id: Date.now(),
        title: title.trim(),
        content: editorContent,
        category,
        color,
        reminder,
        date: getToday(),
        updatedAt: now,
        pinned: false
      };

      setNotes((previousNotes) => [newNote, ...previousNotes]);
    }

    closeModal();
  };

  const togglePin = (id) => {
    setNotes((previousNotes) =>
      previousNotes.map((note) =>
        note.id === id ? { ...note, pinned: !note.pinned } : note
      )
    );
  };

  const deleteNote = (id) => {
    const noteToDelete = notes.find((note) => note.id === id);
    if (!noteToDelete) return;

    setTrash((previousTrash) => [noteToDelete, ...previousTrash]);
    setNotes((previousNotes) => previousNotes.filter((note) => note.id !== id));
  };

  const restoreNote = (id) => {
    const noteToRestore = trash.find((note) => note.id === id);
    if (!noteToRestore) return;

    setNotes((previousNotes) => [noteToRestore, ...previousNotes]);
    setTrash((previousTrash) => previousTrash.filter((note) => note.id !== id));
  };

  const permanentlyDelete = (id) => {
    if (!window.confirm("Permanently delete this note?")) return;
    setTrash((previousTrash) => previousTrash.filter((note) => note.id !== id));
  };

  const showAllNotes = () => {
    setActiveTab("All Notes");
    setActiveCategory("All");
    setActiveView("notes");
    setMenuOpen(false);
  };

  const showFavorites = () => {
    setActiveTab("Favorites");
    setActiveCategory("All");
    setActiveView("notes");
    setMenuOpen(false);
  };

  const showTrash = () => {
    setActiveView("trash");
    setMenuOpen(false);
  };

  const selectCategory = (selectedCategory) => {
    setActiveCategory(selectedCategory);
    setActiveTab("All Notes");
    setActiveView("notes");
    setMenuOpen(false);
  };

  const pageTitle =
    activeView === "trash"
      ? "Trash"
      : activeTab === "Favorites"
        ? "Favorites"
        : activeCategory === "All"
          ? "All Notes"
          : activeCategory;

  const notificationButtonText =
    notificationPermission === "granted"
      ? "Notifications On"
      : notificationPermission === "denied"
        ? "Notifications Blocked"
        : notificationPermission === "unsupported"
          ? "Not Supported"
          : "Enable Notifications";

  return (
    <div className={`app-container ${theme === "dark" ? "dark-mode" : ""}`}>
      <aside className={`sidebar ${menuOpen ? "show-sidebar" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><BookOpen size={23} /></div>
          <h2>NoteNest<span>.</span></h2>
          <button className="close-sidebar" onClick={() => setMenuOpen(false)}>
            <X />
          </button>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <nav className="navigation">
          <button
            className={activeView === "notes" && activeTab === "All Notes" && activeCategory === "All" ? "nav-item active" : "nav-item"}
            onClick={showAllNotes}
          >
            <LayoutGrid size={19} /><span>All Notes</span>
            <span className="nav-count">{notes.length}</span>
          </button>

          <button
            className={activeView === "notes" && activeTab === "Favorites" ? "nav-item active" : "nav-item"}
            onClick={showFavorites}
          >
            <Star size={19} /><span>Favorites</span>
            <span className="nav-count">{notes.filter((note) => note.pinned).length}</span>
          </button>

          <button
            className={activeView === "trash" ? "nav-item active" : "nav-item"}
            onClick={showTrash}
          >
            <Trash2 size={19} /><span>Trash</span>
            <span className="nav-count">{trash.length}</span>
          </button>
        </nav>

        <p className="nav-heading category-heading">CATEGORIES</p>

        <nav className="navigation">
          <button
            className={activeCategory === "All" && activeView === "notes" ? "nav-item active" : "nav-item"}
            onClick={() => selectCategory("All")}
          >
            <span className="category-dot all"></span><span>All Categories</span>
          </button>

          {categories.map((item) => (
            <button
              key={item}
              className={activeCategory === item && activeView === "notes" ? "nav-item active" : "nav-item"}
              onClick={() => selectCategory(item)}
            >
              <span className={`category-dot ${item.toLowerCase()}`}></span>
              <span>{item}</span>
              <span className="nav-count">
                {notes.filter((note) => (note.category || "Personal") === item).length}
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item theme-toggle" onClick={toggleTheme}>
            {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
          </button>

          <div className="profile">
            <div className="avatar">V</div>
            <div><h4>My Workspace</h4><p>Personal Account</p></div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)}>
            <Menu />
          </button>

          <div className="breadcrumb">My Workspace <span>/</span> {pageTitle}</div>

          <div className="topbar-right">
            <button
              type="button"
              className={`notification-toggle ${notificationPermission === "granted" ? "enabled" : ""}`}
              onClick={enableNotifications}
              disabled={notificationPermission === "unsupported"}
              title="Enable browser notifications"
            >
              <Bell size={17} /><span>{notificationButtonText}</span>
            </button>

            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search your notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="shortcut">⌘ K</span>
            </div>
          </div>
        </header>

        <section className="dashboard">
          <div className="welcome-section">
            <div>
              <p className="eyebrow">YOUR PERSONAL SPACE</p>
              <h1>Good morning! Ready to organize your thoughts? <span>✦</span></h1>
              <p className="welcome-text">A fresh start for your ideas.</p>
            </div>

            <div className="welcome-actions">
              {activeView === "notes" && (
                <>
                  <button className="export-all-button" onClick={exportAllNotes}>
                    <Download size={18} /> Export All Notes
                  </button>
                  <button className="create-button" onClick={openNewNote}>
                    <Plus size={19} /> Create Note
                  </button>
                </>
              )}
            </div>
          </div>

          {dueReminders.length > 0 && activeView === "notes" && (
            <div className="reminder-alert">
              <div className="reminder-alert-icon"><Bell size={21} /></div>
              <div className="reminder-alert-text">
                <strong>
                  {dueReminders.length === 1 ? "You have a reminder due!" : `You have ${dueReminders.length} reminders due!`}
                </strong>
                <p>
                  {dueReminders.slice(0, 3).map((note) => note.title).join(", ")}
                  {dueReminders.length > 3 ? " and more..." : ""}
                </p>
              </div>
              <button
                type="button"
                className="reminder-alert-close"
                onClick={() => {
                  const reminderKeys = dueReminders.map((note) => `${note.id}-${note.reminder}`);
                  setDismissedReminders((previous) => [...new Set([...previous, ...reminderKeys])]);
                }}
                title="Dismiss reminder alert"
                aria-label="Dismiss reminder alert"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="section-heading">
            <div>
              <h2>{pageTitle}</h2>
              <p>
                {activeView === "trash"
                  ? `${filteredTrash.length} deleted notes`
                  : `You have ${filteredNotes.length} notes to explore`}
              </p>
            </div>

            <div className="section-controls">
              {activeView === "notes" && (
                <select
                  className="sort-select"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  aria-label="Sort notes"
                >
                  <option value="recent">Recently updated</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title-asc">Title (A–Z)</option>
                  <option value="title-desc">Title (Z–A)</option>
                </select>
              )}

              <button
                type="button"
                className="view-button"
                onClick={toggleView}
                title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
                aria-label={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
              >
                {viewMode === "grid" ? <List size={20} /> : <LayoutGrid size={20} />}
              </button>
            </div>
          </div>

          <div className={`notes-grid ${viewMode === "list" ? "list-view" : ""}`}>
            {activeView === "notes" && sortedNotes.map((note) => {
              const isDue = note.reminder && new Date(note.reminder).getTime() <= currentTime;

              return (
                <article
                  className={`note-card ${note.color || "purple"}`}
                  key={note.id}
                  onClick={() => openEdit(note)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="note-top">
                    <span className="note-date">{note.date}</span>
                    <div className="note-actions">
                      <button
                        title={note.pinned ? "Unpin note" : "Pin note"}
                        onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}
                      >
                        <Pin size={17} fill={note.pinned ? "currentColor" : "none"} />
                      </button>

                      <button
                        title="Copy note"
                        onClick={(e) => { e.stopPropagation(); copyNote(note); }}
                      >
                        <Copy size={17} />
                      </button>

                      <button
                        title="Share note"
                        onClick={(e) => { e.stopPropagation(); shareNote(note); }}
                      >
                        <Share2 size={17} />
                      </button>

                      <button
                        title="Export note as PDF"
                        onClick={(e) => { e.stopPropagation(); exportNote(note); }}
                      >
                        <Download size={17} />
                      </button>

                      <button
                        title="Move to Trash"
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <h3>{note.title}</h3>
                  <div
                    className="note-content rich-note-preview"
                    dangerouslySetInnerHTML={{ __html: note.content || "" }}
                  />

                  {note.reminder && (
                    <div className={`note-reminder ${isDue ? "overdue" : ""}`}>
                      <Clock size={14} />
                      <span>{isDue ? "Reminder due: " : "Reminder: "}{formatReminder(note.reminder)}</span>
                    </div>
                  )}

                  <div className="note-footer">
                    <Tag size={15} /><span>{note.category || "Personal"}</span>
                    {note.pinned && <Pin size={15} className="pinned-icon" />}
                  </div>
                </article>
              );
            })}

            {activeView === "notes" && (
              <button className="add-note-card" onClick={openNewNote}>
                <div className="add-icon"><Plus size={25} /></div>
                <h3>Create a new note</h3>
                <p>Write down what's on your mind</p>
              </button>
            )}

            {activeView === "trash" && filteredTrash.map((note) => (
              <article className={`note-card ${note.color || "purple"}`} key={note.id}>
                <div className="note-top">
                  <span className="note-date">{note.date}</span>
                  <div className="note-actions">
                    <button title="Restore note" onClick={() => restoreNote(note.id)}>
                      <RotateCcw size={17} />
                    </button>
                    <button title="Delete permanently" onClick={() => permanentlyDelete(note.id)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <h3>{note.title}</h3>
                <div
                  className="note-content rich-note-preview"
                  dangerouslySetInnerHTML={{ __html: note.content || "" }}
                />

                {note.reminder && (
                  <div className="note-reminder">
                    <Clock size={14} /><span>{formatReminder(note.reminder)}</span>
                  </div>
                )}

                <div className="note-footer">
                  <FileText size={16} /><span>Deleted note</span>
                </div>
              </article>
            ))}
          </div>

          {activeView === "notes" && filteredNotes.length === 0 && (
            <div className="empty-state">
              <FileText size={35} />
              <h3>No notes found</h3>
              <p>Try another search or create a new note.</p>
            </div>
          )}

          {activeView === "trash" && filteredTrash.length === 0 && (
            <div className="empty-state">
              <Trash2 size={35} />
              <h3>Your trash is empty</h3>
              <p>Deleted notes will appear here.</p>
            </div>
          )}
        </section>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="note-modal rich-note-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingNoteId !== null ? "Edit Note" : "Create a new note"}</h2>
              <button onClick={closeModal}><X /></button>
            </div>

            <input
              className="modal-title"
              type="text"
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <select
              className="modal-title"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>

            <div className="color-picker-section">
              <p className="color-picker-label">Choose note color</p>
              <div className="color-options">
                {noteColors.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    className={`color-option ${color === item.name ? "selected" : ""}`}
                    style={{ backgroundColor: item.color }}
                    onClick={() => setColor(item.name)}
                    title={item.label}
                    aria-label={`Choose ${item.label}`}
                    aria-pressed={color === item.name}
                  >
                    {color === item.name && <span className="color-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="reminder-picker-section">
              <label className="reminder-picker-label" htmlFor="note-reminder">
                <CalendarClock size={17} /> Set a reminder
              </label>

              <input
                id="note-reminder"
                className="reminder-date-input"
                type="datetime-local"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
              />

              {reminder && (
                <button
                  type="button"
                  className="clear-reminder-button"
                  onClick={() => setReminder("")}
                >
                  <X size={14} /> Remove reminder
                </button>
              )}

              <p className="reminder-help-text">
                Browser notifications work while NoteNest is open. Keep the app running to receive your reminders.
              </p>
            </div>

            {/* RICH TEXT TOOLBAR */}
            <div className="editor-toolbar">
              <button type="button" title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => formatText("bold")}>
                <Bold size={18} />
              </button>
              <button type="button" title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => formatText("italic")}>
                <Italic size={18} />
              </button>
              <button type="button" title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => formatText("underline")}>
                <Underline size={18} />
              </button>

              <span className="toolbar-divider"></span>

              <button type="button" title="Heading 1" onMouseDown={(e) => e.preventDefault()} onClick={() => formatText("formatBlock", "H1")}>
                <Heading1 size={19} />
              </button>
              <button type="button" title="Heading 2" onMouseDown={(e) => e.preventDefault()} onClick={() => formatText("formatBlock", "H2")}>
                <Heading2 size={19} />
              </button>

              <span className="toolbar-divider"></span>

              <button type="button" title="Bullet list" onMouseDown={(e) => e.preventDefault()} onClick={() => formatText("insertUnorderedList")}>
                <ListIcon size={18} />
              </button>
              <button type="button" title="Numbered list" onMouseDown={(e) => e.preventDefault()} onClick={() => formatText("insertOrderedList")}>
                <ListOrdered size={18} />
              </button>

              <span className="toolbar-divider"></span>

              <button type="button" title="Undo" onMouseDown={(e) => e.preventDefault()} onClick={() => formatText("undo")}>
                <Undo size={18} />
              </button>
              <button type="button" title="Redo" onMouseDown={(e) => e.preventDefault()} onClick={() => formatText("redo")}>
                <Redo size={18} />
              </button>
              <button type="button" title="Clear formatting" onMouseDown={(e) => e.preventDefault()} onClick={() => formatText("removeFormat")}>
                <RemoveFormatting size={18} />
              </button>
            </div>

            {/* RICH TEXT EDITOR */}
            <div
              ref={editorRef}
              className="rich-text-editor"
              contentEditable
              suppressContentEditableWarning
              onInput={updateEditorContent}
              data-placeholder="Start writing your thoughts..."
            />

            <div className="modal-footer">
              <button className="cancel-button" onClick={closeModal}>Cancel</button>
              <button className="save-button" onClick={saveNote}>
                <Plus size={17} />
                {editingNoteId !== null ? "Update Note" : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
