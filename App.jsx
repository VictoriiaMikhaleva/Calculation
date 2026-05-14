import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  Filter,
  LineChart,
  PiggyBank,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  X,
  Pencil,
  Save,
} from "lucide-react";
import alinaPhoto from "./Алина.png";
import alisaPhoto from "./Алиса1.jpg";
import vikaPhoto from "./Вика.png";
import grishaPhoto from "./ГришА.png";
import {
  listenBudgetFromCloud,
  saveBudgetToCloud,
} from "./firebase";
const FAMILY_MEMBERS = [
  { id: "alisa", name: "Алиса", photo: alisaPhoto },
  { id: "alina", name: "Алина", photo: alinaPhoto },
  { id: "grisha", name: "Гриша", photo: grishaPhoto },
  { id: "vika", name: "Вика", photo: vikaPhoto },
];

const MEMBER_OPTIONS = [{ id: "all", name: "Все", photo: null }, ...FAMILY_MEMBERS];

const EXPENSE_CATEGORIES = [
  "Еда",
  "Вещи",
  "Кафе",
  "Развлечения",
  "Транспорт",
  "Дом",
  "Здоровье",
  "Образование",
  "Подарки",
  "Путешествия",
  "Связь",
  "Красота",
  "Другое",
  "Своя статья",
];

const INCOME_CATEGORIES = [
  "Зарплата",
  "Премия",
  "Подработка",
  "Подарок",
  "Кэшбэк",
  "Возврат",
  "Инвестиции",
  "Своя статья",
];

const DEFAULT_LIMITS = {
  "Еда": 0,
  "Вещи": 0,
  "Кафе": 0,
  "Развлечения": 0,
  "Транспорт": 0,
  "Дом": 0,
  "Здоровье": 0,
  "Образование": 0,
  "Подарки": 0,
  "Путешествия": 0,
  "Связь": 0,
  "Красота": 0,
  "Другое": 0,
  "Своя статья": 0,
};

const PIE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#64748b",
  "#14b8a6",
  "#fb7185",
  "#a855f7",
  "#22c55e",
];

const STORAGE_KEY = "family-budget-app-v4";

const currency = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now() + Math.random());
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(date) {
  return String(date || today()).slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split("-");
  return `${month}.${year}`;
}

function getMemberById(memberId) {
  return MEMBER_OPTIONS.find((member) => member.id === memberId) || MEMBER_OPTIONS[0];
}

function getMemberName(memberId) {
  return getMemberById(memberId).name;
}
function getMemberPhoto(memberId) {
  return getMemberById(memberId).photo;
}
function getCategoryLabel(item) {
  if (item.category === "Своя статья") return item.customCategory?.trim() || "Своя статья";
  return item.category;
}

function getDefaultCategory(type) {
  return type === "expense" ? "Еда" : "Зарплата";
}

function sumAmounts(items, condition) {
  return items.reduce((sum, item) => (condition(item) ? sum + Number(item.amount || 0) : sum), 0);
}

export default function App() {
    const cloudLoadedRef = useRef(false);
  const applyingCloudRef = useRef(false);
  console.log("App запустился, Firebase должен подключиться");
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed.transactions) ? parsed.transactions : [];
    } catch {
      return [];
    }
  });

  const [limits, setLimits] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_LIMITS;

    try {
      const parsed = JSON.parse(saved);
      return parsed.limits || DEFAULT_LIMITS;
    } catch {
      return DEFAULT_LIMITS;
    }
  });

  const [filterMember, setFilterMember] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [form, setForm] = useState({
    type: "expense",
    memberId: "all",
    category: "Еда",
    customCategory: "",
    amount: "",
    date: today(),
    note: "",
  });

 useEffect(() => {
  console.log("Подключаюсь к Firestore...");
   const unsubscribe = listenBudgetFromCloud(
    (cloudData) => {
      applyingCloudRef.current = true;

      if (cloudData?.transactions && Array.isArray(cloudData.transactions)) {
        setTransactions(cloudData.transactions);
      }

      if (cloudData?.limits) {
        setLimits(cloudData.limits);
      }

      if (!cloudData) {
        saveBudgetToCloud({
          transactions,
          limits,
        });
      }

      cloudLoadedRef.current = true;

      setTimeout(() => {
        applyingCloudRef.current = false;
      }, 0);
    },
    (error) => {
      console.error("Ошибка загрузки бюджета из Firebase:", error);
      cloudLoadedRef.current = true;
    }
  );

  return () => unsubscribe();
}, []);

useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions, limits }));
}, [transactions, limits]);

  const availableMonths = useMemo(() => {
    const months = [...new Set(transactions.map((item) => monthKey(item.date)))].sort().reverse();
    return months;
  }, [transactions]);

  const visibleTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...transactions]
      .filter((item) => (filterMember === "all" ? true : item.memberId === filterMember))
      .filter((item) => (filterType === "all" ? true : item.type === filterType))
      .filter((item) => (filterMonth === "all" ? true : monthKey(item.date) === filterMonth))
      .filter((item) => {
        if (!query) return true;
        const text = [
          item.date,
          item.type === "income" ? "доход" : "расход",
          getMemberName(item.memberId),
          getCategoryLabel(item),
          item.note,
          item.amount,
        ]
          .join(" ")
          .toLowerCase();
        return text.includes(query);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filterMember, filterType, filterMonth, searchQuery]);

  const totalIncome = useMemo(() => sumAmounts(transactions, (item) => item.type === "income"), [transactions]);
  const totalExpense = useMemo(() => sumAmounts(transactions, (item) => item.type === "expense"), [transactions]);
  const balance = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;

  const filteredIncome = useMemo(() => sumAmounts(visibleTransactions, (item) => item.type === "income"), [visibleTransactions]);
  const filteredExpense = useMemo(() => sumAmounts(visibleTransactions, (item) => item.type === "expense"), [visibleTransactions]);
  const averageExpense = totalExpense > 0 && transactions.filter((item) => item.type === "expense").length > 0
    ? Math.round(totalExpense / transactions.filter((item) => item.type === "expense").length)
    : 0;

  const expensesByCategory = useMemo(() => {
    const map = new Map();
    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        const label = getCategoryLabel(item);
        map.set(label, (map.get(label) || 0) + Number(item.amount || 0));
      });

    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const biggestExpense = expensesByCategory[0] || null;

  const memberBarData = useMemo(() => {
    return MEMBER_OPTIONS.map((member) => ({
      name: member.name,
      Доходы: sumAmounts(transactions, (item) => item.memberId === member.id && item.type === "income"),
      Расходы: sumAmounts(transactions, (item) => item.memberId === member.id && item.type === "expense"),
    }));
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const map = new Map();

    transactions.forEach((item) => {
      const key = monthKey(item.date);
      if (!map.has(key)) {
        map.set(key, { key, month: monthLabel(key), Доходы: 0, Расходы: 0, Баланс: 0 });
      }
      const row = map.get(key);
      if (item.type === "income") row["Доходы"] += Number(item.amount || 0);
      if (item.type === "expense") row["Расходы"] += Number(item.amount || 0);
      row["Баланс"] = row["Доходы"] - row["Расходы"];
    });

    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [transactions]);

  const limitsData = useMemo(() => {
    return Object.entries(limits)
      .map(([category, limit]) => {
        const spent = sumAmounts(
          transactions,
          (item) =>
            item.type === "expense" &&
            getCategoryLabel(item) === category &&
            monthKey(item.date) === monthKey(today())
        );
        const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
        return { category, limit: Number(limit || 0), spent, percent, remaining: Math.max(Number(limit || 0) - spent, 0) };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [limits, transactions]);

  const advice = useMemo(() => {
    const tips = [];
    if (savingRate < 10 && totalIncome > 0) {
      tips.push("Норма накопления ниже 10%. Попробуйте временно снизить траты на кафе, развлечения или вещи.");
    }
    if (biggestExpense) {
      tips.push(`Больше всего денег уходит на «${biggestExpense.name}». Проверьте, можно ли поставить месячный лимит.`);
    }
    const overLimit = limitsData.find((item) => item.percent >= 100);
    if (overLimit) {
      tips.push(`Лимит по статье «${overLimit.category}» уже превышен или достигнут. Новые траты лучше согласовывать отдельно.`);
    }
    if (balance > 0 && savingRate >= 20) {
      tips.push("Баланс выглядит хорошо: можно часть остатка направить в накопления, отпуск или резервный фонд.");
    }
    if (!tips.length) tips.push("Добавьте больше операций, и здесь появятся персональные подсказки по бюджету.");
    return tips;
  }, [savingRate, totalIncome, biggestExpense, limitsData, balance]);

  const selectedMemberPreview = getMemberById(form.memberId);

  function resetForm(type = form.type) {
    setForm({
      type,
      memberId: "all",
      category: getDefaultCategory(type),
      customCategory: "",
      amount: "",
      date: today(),
      note: "",
    });
    setEditingId(null);
  }

  function handleTypeChange(type) {
    setForm((prev) => ({ ...prev, type, category: getDefaultCategory(type), customCategory: "" }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      alert("Введите корректную сумму");
      return;
    }

    if (form.category === "Своя статья" && !form.customCategory.trim()) {
      alert("Введите название своей статьи");
      return;
    }

    const prepared = {
      id: editingId || createId(),
      type: form.type,
      memberId: form.memberId,
      category: form.category,
      customCategory: form.category === "Своя статья" ? form.customCategory.trim() : "",
      amount,
      date: form.date,
      note: form.note.trim(),
    };

    if (editingId) {
      setTransactions((prev) => prev.map((item) => (item.id === editingId ? prepared : item)));
    } else {
      setTransactions((prev) => [prepared, ...prev]);
    }

    resetForm(form.type);
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setForm({
      type: item.type,
      memberId: item.memberId,
      category: item.category,
      customCategory: item.customCategory || "",
      amount: String(item.amount),
      date: item.date,
      note: item.note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id) {
    setTransactions((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) resetForm();
  }

  function handleClearAll() {
    if (window.confirm("Удалить все операции?")) {
      setTransactions([]);
      resetForm();
    }
  }

  function handleResetFilters() {
    setFilterMember("all");
    setFilterType("all");
    setFilterMonth("all");
    setSearchQuery("");
  }

  function exportCsv() {
    const header = ["Дата", "Тип", "Участник", "Статья", "Сумма", "Комментарий"];
    const rows = transactions.map((item) => [
      item.date,
      item.type === "income" ? "Доход" : "Расход",
      getMemberName(item.memberId),
      getCategoryLabel(item),
      item.amount,
      item.note || "",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "family-budget.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ transactions, limits }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "family-budget-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.transactions)) throw new Error("bad file");
        setTransactions(parsed.transactions);
        setLimits(parsed.limits || DEFAULT_LIMITS);
        resetForm();
      } catch {
        alert("Не получилось импортировать файл. Проверьте, что это JSON-экспорт из этого приложения.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-6 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-300">
                <Users size={16} /> Семейный бюджет: Алиса, Алина, Гриша и Вика
              </div>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Калькулятор доходов и расходов</h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Вносите доходы и траты, выбирайте участника семьи, следите за лимитами, графиками, балансом и накоплениями.
              </p>
            </div>

            <div className={`rounded-3xl p-5 text-right ${balance >= 0 ? "bg-green-500/15" : "bg-red-500/15"}`}>
              <p className="text-sm text-slate-300">Текущий баланс</p>
              <p className={`text-4xl font-black ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>{currency.format(balance)}</p>
              <p className="mt-1 text-sm text-slate-400">Норма накопления: {savingRate}%</p>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users size={20} />
              <h2 className="text-2xl font-bold">Участники семьи</h2>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FAMILY_MEMBERS.map((member) => {
              const income = sumAmounts(transactions, (item) => item.memberId === member.id && item.type === "income");
              const expense = sumAmounts(transactions, (item) => item.memberId === member.id && item.type === "expense");

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setFilterMember(member.id)}
                  className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-left transition hover:-translate-y-1 hover:bg-slate-900"
                >
                  <div className="flex items-center gap-4">
                    <MemberAvatar name={member.name} photo={member.photo} size="lg" />
                    <div>
                      <div className="text-xl font-bold">{member.name}</div>
                      <div className="mt-1 text-sm text-green-400">+ {currency.format(income)}</div>
                      <div className="text-sm text-red-400">- {currency.format(expense)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={<TrendingUp />} label="Доходы" value={currency.format(totalIncome)} tone="green" />
          <StatCard icon={<TrendingDown />} label="Расходы" value={currency.format(totalExpense)} tone="red" />
          <StatCard icon={<Wallet />} label="Остаток" value={currency.format(balance)} tone={balance >= 0 ? "green" : "red"} />
          <StatCard icon={<PiggyBank />} label="Средний расход" value={currency.format(averageExpense)} tone="slate" />
          <StatCard
            icon={<Target />}
            label="Главная статья"
            value={biggestExpense ? `${biggestExpense.name}: ${currency.format(biggestExpense.value)}` : "Пока нет"}
            tone="slate"
          />
        </section>

        <main className="grid gap-6 lg:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{editingId ? "Редактировать операцию" : "Добавить операцию"}</h2>
              {editingId && (
                <button type="button" onClick={() => resetForm()} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
                  <X size={16} /> Отмена
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-900 p-1">
                <button
                  type="button"
                  onClick={() => handleTypeChange("expense")}
                  className={`rounded-xl px-4 py-3 font-semibold transition ${form.type === "expense" ? "bg-red-500 text-white" : "text-slate-400 hover:bg-white/5"}`}
                >
                  Расход
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("income")}
                  className={`rounded-xl px-4 py-3 font-semibold transition ${form.type === "income" ? "bg-green-500 text-white" : "text-slate-400 hover:bg-white/5"}`}
                >
                  Доход
                </button>
              </div>

              <Field label="Участник">
                <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}>
                  {MEMBER_OPTIONS.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </Field>

              <div className="mb-4 rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                <div className="flex items-center gap-3">
            <MemberAvatar
  name={selectedMemberPreview.name}
  photo={selectedMemberPreview.photo}
  size="md"
/>
                  <div>
                    <div className="text-sm text-slate-400">Выбрано</div>
                    <div className="font-semibold">{selectedMemberPreview.name}</div>
                  </div>
                </div>
              </div>

              <Field label="Категория">
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {(form.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </Field>

              {form.category === "Своя статья" && (
                <Field label="Своя статья">
                  <input className="input" value={form.customCategory} onChange={(e) => setForm({ ...form, customCategory: e.target.value })} placeholder="Например: ремонт, кружки, отпуск" />
                </Field>
              )}

              <Field label="Сумма">
                <input className="input" type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
              </Field>

              <Field label="Дата">
                <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>

              <Field label="Комментарий">
                <input className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Например: магазин, кружок, поездка" />
              </Field>

              <button
                type="submit"
                className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-bold text-white shadow-lg transition hover:scale-[1.01] ${form.type === "expense" ? "bg-red-500 hover:bg-red-400" : "bg-green-500 hover:bg-green-400"}`}
              >
                {editingId ? <Save size={18} /> : <Plus size={18} />}
                {editingId ? "Сохранить изменения" : "Добавить"}
              </button>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={exportCsv} className="utility-button"><Download size={16} /> CSV</button>
                <button type="button" onClick={exportJson} className="utility-button"><Download size={16} /> JSON</button>
                <label className="utility-button cursor-pointer">
                  <Upload size={16} /> Импорт
                  <input type="file" accept="application/json" onChange={importJson} className="hidden" />
                </label>
                <button type="button" onClick={handleResetFilters} className="utility-button"><Filter size={16} /> Фильтры</button>
                <button type="button" onClick={handleClearAll} className="utility-button"><Trash2 size={16} /> Очистить</button>
              </div>
            </form>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-2 shadow-xl">
              <div className="grid gap-2 md:grid-cols-4">
                <TabButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={<LineChart size={16} />} label="Графики" />
                <TabButton active={activeTab === "limits"} onClick={() => setActiveTab("limits")} icon={<Target size={16} />} label="Лимиты" />
                <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")} icon={<CalendarDays size={16} />} label="История" />
                <TabButton active={activeTab === "advice"} onClick={() => setActiveTab("advice")} icon={<CheckCircle2 size={16} />} label="Советы" />
              </div>
            </div>

            {activeTab === "dashboard" && (
              <div className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-2">
                  <ChartCard title="На что уходит больше денег">
                    {expensesByCategory.length ? (
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie data={expensesByCategory} dataKey="value" nameKey="name" outerRadius={112} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                            {expensesByCategory.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value) => currency.format(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <EmptyState text="Добавьте расходы, чтобы увидеть диаграмму." />}
                  </ChartCard>

                  <ChartCard title="Доходы и расходы по участникам">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={memberBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="name" stroke="#cbd5e1" />
                        <YAxis stroke="#cbd5e1" tickFormatter={(value) => `${Math.round(value / 1000)}к`} />
                        <Tooltip formatter={(value) => currency.format(value)} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }} />
                        <Legend />
                        <Bar dataKey="Доходы" fill="#22c55e" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Расходы" fill="#ef4444" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <ChartCard title="Динамика по месяцам">
                  {monthlyData.length ? (
                    <ResponsiveContainer width="100%" height={330}>
                      <AreaChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="month" stroke="#cbd5e1" />
                        <YAxis stroke="#cbd5e1" tickFormatter={(value) => `${Math.round(value / 1000)}к`} />
                        <Tooltip formatter={(value) => currency.format(value)} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }} />
                        <Legend />
                        <Area type="monotone" dataKey="Доходы" stroke="#22c55e" fill="#22c55e" fillOpacity={0.18} />
                        <Area type="monotone" dataKey="Расходы" stroke="#ef4444" fill="#ef4444" fillOpacity={0.18} />
                        <Area type="monotone" dataKey="Баланс" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.12} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <EmptyState text="Добавьте операции за разные месяцы, чтобы увидеть динамику." />}
                </ChartCard>
              </div>
            )}

            {activeTab === "limits" && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
                <div className="mb-4 flex items-center gap-2">
                  <Target size={20} />
                  <h2 className="text-2xl font-bold">Лимиты на текущий месяц</h2>
                </div>

                <div className="space-y-3">
                  {limitsData.map((item) => (
                    <div key={item.category} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                      <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2 font-bold">
                            {item.percent >= 100 && <AlertTriangle size={18} className="text-red-400" />}
                            {item.category}
                          </div>
                          <div className="text-sm text-slate-400">
                            Потрачено {currency.format(item.spent)} из {currency.format(item.limit)}. Осталось {currency.format(item.remaining)}.
                          </div>
                        </div>
                        <input
                          className="small-input w-full md:w-40"
                          type="number"
                          min="0"
                          value={item.limit}
                          onChange={(e) => setLimits((prev) => ({ ...prev, [item.category]: Number(e.target.value || 0) }))}
                        />
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full ${item.percent >= 100 ? "bg-red-500" : item.percent >= 80 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${Math.min(item.percent, 100)}%` }} />
                      </div>
                      <div className="mt-1 text-right text-xs text-slate-400">{item.percent}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
                <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">История операций</h2>
                    <p className="mt-1 text-sm text-slate-400">В фильтре: доходы {currency.format(filteredIncome)}, расходы {currency.format(filteredExpense)}</p>
                  </div>

                  <div className="grid gap-2 md:grid-cols-4">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input className="small-input w-full pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Поиск" />
                    </div>
                    <select className="small-input" value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
                      {MEMBER_OPTIONS.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                    <select className="small-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                      <option value="all">Все типы</option>
                      <option value="income">Доходы</option>
                      <option value="expense">Расходы</option>
                    </select>
                    <select className="small-input" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                      <option value="all">Все месяцы</option>
                      {availableMonths.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="bg-slate-900 text-slate-300">
                      <tr>
                        <th className="p-3">Дата</th>
                        <th className="p-3">Тип</th>
                        <th className="p-3">Участник</th>
                        <th className="p-3">Статья</th>
                        <th className="p-3">Комментарий</th>
                        <th className="p-3 text-right">Сумма</th>
                        <th className="p-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTransactions.map((item) => (
                        <tr key={item.id} className="border-t border-white/10 hover:bg-white/5">
                          <td className="p-3 text-slate-300">{item.date}</td>
                          <td className="p-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.type === "income" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                              {item.type === "income" ? "Доход" : "Расход"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                            <MemberAvatar
  name={getMemberName(item.memberId)}
  photo={getMemberPhoto(item.memberId)}
  size="sm"
/>
                              <span>{getMemberName(item.memberId)}</span>
                            </div>
                          </td>
                          <td className="p-3">{getCategoryLabel(item)}</td>
                          <td className="p-3 text-slate-400">{item.note || "—"}</td>
                          <td className={`p-3 text-right font-bold ${item.type === "income" ? "text-green-400" : "text-red-400"}`}>
                            {item.type === "income" ? "+" : "-"}{currency.format(item.amount)}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={() => handleEdit(item)} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white" title="Редактировать"><Pencil size={16} /></button>
                              <button type="button" onClick={() => handleDelete(item.id)} className="rounded-xl p-2 text-slate-400 hover:bg-red-500/15 hover:text-red-400" title="Удалить"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visibleTransactions.length && <EmptyState text="Операций по выбранным фильтрам пока нет." />}
                </div>
              </div>
            )}

            {activeTab === "advice" && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 size={20} />
                  <h2 className="text-2xl font-bold">Подсказки по бюджету</h2>
                </div>

                <div className="space-y-3">
                  {advice.map((tip, index) => (
                    <div key={index} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-slate-200">
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.10);
          background: #0f172a;
          padding: 0.85rem 1rem;
          color: white;
          outline: none;
        }
        .input:focus,
        .small-input:focus {
          border-color: rgba(59,130,246,0.9);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.18);
        }
        .small-input {
          border-radius: 0.9rem;
          border: 1px solid rgba(255,255,255,0.10);
          background: #0f172a;
          padding: 0.65rem 0.85rem;
          color: white;
          outline: none;
        }
        .utility-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          border-radius: 1rem;
          background: rgba(255,255,255,0.07);
          padding: 0.75rem;
          font-size: 0.85rem;
          color: #cbd5e1;
          transition: 0.2s;
        }
        .utility-button:hover {
          background: rgba(255,255,255,0.12);
          color: white;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition ${
        active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ icon, label, value, tone }) {
  const toneClass = {
    green: "border-green-500/20 bg-green-500/10 text-green-400",
    red: "border-red-500/20 bg-red-500/10 text-red-400",
    slate: "border-white/10 bg-white/5 text-slate-200",
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-xl ${toneClass}`}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">{icon}</div>
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="flex min-h-[160px] items-center justify-center p-6 text-center text-slate-400">{text}</div>;
}

function MemberAvatar({ name, photo, size = "md" }) {
  const initial = String(name || "?").trim().slice(0, 1).toUpperCase();

  const box =
    size === "lg"
      ? "h-20 w-20 text-2xl"
      : size === "sm"
        ? "h-8 w-8 text-xs"
        : "h-12 w-12 text-base";

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`shrink-0 rounded-full object-cover ring-2 ring-white/10 ${box}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-600/45 to-violet-700/45 font-bold text-white ring-2 ring-white/10 ${box}`}
      aria-hidden
    >
      {initial}
    </div>
  );
}
