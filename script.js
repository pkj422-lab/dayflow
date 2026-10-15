(function () {
  "use strict";

  const STORAGE_KEY = "dayflow-data-v1";
  const CATEGORIES = ["공부", "운동", "건강", "생활", "기타"];
  const today = toDateKey(new Date());
  let selectedDate = today;
  let categoryFilter = "all";
  let chart = null;
  let toastTimer = null;
  let storageAvailable = true;

  const elements = {
    saveStatus: document.getElementById("save-status"),
    selectedDate: document.getElementById("selected-date"),
    todayLabel: document.getElementById("today-label"),
    previousDay: document.getElementById("previous-day"),
    nextDay: document.getElementById("next-day"),
    routineCount: document.getElementById("routine-count"),
    routineCountLabel: document.getElementById("routine-count-label"),
    completedCount: document.getElementById("completed-count"),
    completionRate: document.getElementById("completion-rate"),
    completionRateLabel: document.getElementById("completion-rate-label"),
    streakCount: document.getElementById("streak-count"),
    completedCaption: document.getElementById("completed-caption"),
    rateCaption: document.getElementById("rate-caption"),
    progressPercent: document.getElementById("progress-percent"),
    progressSummaryText: document.getElementById("progress-summary-text"),
    progressBar: document.getElementById("progress-bar"),
    progressFill: document.getElementById("progress-fill"),
    progressDone: document.getElementById("progress-done"),
    progressLeft: document.getElementById("progress-left"),
    progressDate: document.getElementById("progress-date"),
    progressTip: document.getElementById("progress-tip"),
    routineListCount: document.getElementById("routine-list-count"),
    routineList: document.getElementById("routine-list"),
    emptyState: document.getElementById("empty-state"),
    emptyTitle: document.getElementById("empty-title"),
    emptyCopy: document.getElementById("empty-copy"),
    categoryFilter: document.getElementById("category-filter"),
    feedbackLead: document.getElementById("feedback-lead"),
    feedbackLabel: document.getElementById("feedback-label"),
    feedbackDetail: document.getElementById("feedback-detail"),
    chartFootnote: document.getElementById("chart-footnote"),
    dialog: document.getElementById("routine-dialog"),
    form: document.getElementById("routine-form"),
    dialogTitle: document.getElementById("dialog-title"),
    routineId: document.getElementById("routine-id"),
    routineName: document.getElementById("routine-name"),
    routineCategory: document.getElementById("routine-category"),
    toast: document.getElementById("toast")
  };

  let data = loadData();
  initialize();

  // 날짜를 YYYY-MM-DD 형식으로 만들어 날짜별 기록 키로 사용합니다.
  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // 날짜 문자열을 시간대 영향을 받지 않도록 로컬 날짜로 변환합니다.
  function dateFromKey(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // 기준 날짜에서 일수를 더하거나 빼 새 날짜 키를 반환합니다.
  function shiftDate(dateKey, amount) {
    const date = dateFromKey(dateKey);
    date.setDate(date.getDate() + amount);
    return toDateKey(date);
  }

  // 첫 방문에만 완료 기록이 없는 예시 루틴을 준비합니다.
  function createSampleData() {
    const createdAt = toDateKey(new Date());
    return {
      routines: [
        { id: makeId(), name: "아침 스트레칭 10분", category: "운동", createdAt, archivedAt: null, completedDates: [] },
        { id: makeId(), name: "영어 단어 20개 외우기", category: "공부", createdAt, archivedAt: null, completedDates: [] },
        { id: makeId(), name: "물 6잔 마시기", category: "건강", createdAt, archivedAt: null, completedDates: [] },
        { id: makeId(), name: "잠들기 전 책 읽기", category: "생활", createdAt, archivedAt: null, completedDates: [] }
      ]
    };
  }

  // 저장 데이터의 모양을 확인하고 잘못된 항목은 안전한 기본값으로 정리합니다.
  function normalizeData(parsed) {
    if (!parsed || !Array.isArray(parsed.routines)) return null;
    const routines = parsed.routines.filter((item) => item && typeof item === "object").map((item) => {
      const createdAt = isDateKey(item.createdAt) ? item.createdAt : today;
      const completedDates = Array.isArray(item.completedDates)
        ? [...new Set(item.completedDates.filter(isDateKey))]
        : [];
      return {
        id: typeof item.id === "string" && item.id ? item.id : makeId(),
        name: typeof item.name === "string" ? item.name.trim().slice(0, 30) : "이름 없는 루틴",
        category: CATEGORIES.includes(item.category) ? item.category : "기타",
        createdAt,
        archivedAt: isDateKey(item.archivedAt) ? item.archivedAt : null,
        completedDates
      };
    }).filter((item) => item.name);
    return { routines };
  }

  // localStorage가 비어 있거나 손상되어도 기본 화면이 열리도록 처리합니다.
  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) return createSampleData();
      const normalized = normalizeData(JSON.parse(saved));
      return normalized || createSampleData();
    } catch (error) {
      storageAvailable = false;
      return createSampleData();
    }
  }

  // 현재 루틴 목록과 날짜별 기록을 브라우저에 저장합니다.
  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
    }
    elements.saveStatus.textContent = storageAvailable ? "이 기기에 저장됨" : "브라우저 저장 공간을 사용할 수 없음";
    elements.saveStatus.closest(".sync-status").classList.toggle("is-error", !storageAvailable);
  }

  function isDateKey(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = dateFromKey(value);
    return toDateKey(date) === value;
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `routine-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  // 선택한 날짜에 존재하는 루틴만 반환해 과거 통계를 정확히 계산합니다.
  function getRoutinesForDate(dateKey) {
    return data.routines.filter((routine) => routine.createdAt <= dateKey && (!routine.archivedAt || routine.archivedAt > dateKey));
  }

  function getCompletedCount(routines, dateKey) {
    return routines.filter((routine) => routine.completedDates.includes(dateKey)).length;
  }

  function getCompletionRate(routines, dateKey) {
    if (routines.length === 0) return 0;
    return Math.round((getCompletedCount(routines, dateKey) / routines.length) * 100);
  }

  // 연속 실천은 하루의 모든 루틴을 마친 날을 기준으로 계산합니다.
  function getStreak(dateKey) {
    let cursor = dateKey;
    let streak = 0;
    const todayRoutines = getRoutinesForDate(cursor);
    if (todayRoutines.length > 0 && getCompletedCount(todayRoutines, cursor) === todayRoutines.length) {
      streak += 1;
    }
    cursor = shiftDate(cursor, -1);
    for (let checked = 0; checked < 365; checked += 1) {
      const routines = getRoutinesForDate(cursor);
      if (routines.length === 0 || getCompletedCount(routines, cursor) !== routines.length) break;
      streak += 1;
      cursor = shiftDate(cursor, -1);
    }
    return streak;
  }

  // DOM API와 textContent만 사용해 사용자 입력을 안전하게 화면에 표시합니다.
  function renderRoutineList(routines) {
    elements.routineList.replaceChildren();
    const visibleRoutines = categoryFilter === "all"
      ? routines
      : routines.filter((routine) => routine.category === categoryFilter);
    elements.routineListCount.textContent = String(routines.length);
    elements.emptyState.hidden = visibleRoutines.length > 0;

    if (routines.length === 0) {
      elements.emptyTitle.textContent = "아직 등록된 루틴이 없어요";
      elements.emptyCopy.textContent = "작은 습관 하나를 더해 오늘의 흐름을 시작해 보세요.";
    } else if (visibleRoutines.length === 0) {
      elements.emptyTitle.textContent = "이 카테고리의 루틴이 없어요";
      elements.emptyCopy.textContent = "다른 카테고리를 선택하거나 새 루틴을 추가해 보세요.";
    }

    visibleRoutines.forEach((routine, index) => {
      const completed = routine.completedDates.includes(selectedDate);
      const row = document.createElement("article");
      row.className = `routine-row${completed ? " is-complete" : ""}`;
      row.style.animationDelay = `${Math.min(index * 35, 175)}ms`;

      const check = document.createElement("button");
      check.className = `routine-check${completed ? " is-complete" : ""}`;
      check.type = "button";
      check.dataset.action = "toggle";
      check.dataset.id = routine.id;
      check.textContent = "✓";
      check.setAttribute("aria-label", `${routine.name} ${completed ? "완료 취소" : "완료 표시"}`);
      check.setAttribute("aria-pressed", String(completed));

      const info = document.createElement("div");
      info.className = "routine-info";
      const name = document.createElement("div");
      name.className = "routine-name";
      name.textContent = routine.name;
      const meta = document.createElement("div");
      meta.className = "routine-meta";
      const category = document.createElement("span");
      category.className = "category-tag";
      category.dataset.category = routine.category;
      category.textContent = routine.category;
      const frequency = document.createElement("span");
      frequency.className = "routine-time";
      frequency.textContent = "매일";
      meta.append(category, frequency);
      info.append(name, meta);

      const menu = document.createElement("details");
      menu.className = "routine-menu";
      const summary = document.createElement("summary");
      summary.textContent = "···";
      summary.setAttribute("aria-label", `${routine.name} 메뉴`);
      const menuItems = document.createElement("div");
      menuItems.className = "routine-menu-items";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.dataset.action = "edit";
      edit.dataset.id = routine.id;
      edit.textContent = "수정";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.action = "delete";
      remove.dataset.id = routine.id;
      remove.textContent = "삭제";
      menuItems.append(edit, remove);
      menu.append(summary, menuItems);
      row.append(check, info, menu);
      elements.routineList.append(row);
    });
  }

  function renderStats(routines) {
    const total = routines.length;
    const completed = getCompletedCount(routines, selectedDate);
    const rate = getCompletionRate(routines, selectedDate);
    const remaining = total - completed;
    const selected = dateFromKey(selectedDate);
    const dateLabel = selected.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
    const dateContext = selectedDate === today ? "오늘" : "선택 날짜";

    elements.selectedDate.textContent = `${selected.getFullYear()}년 ${dateLabel}`;
    elements.todayLabel.textContent = selectedDate === today ? "오늘의 흐름" : "선택한 날짜의 흐름";
    elements.routineCountLabel.textContent = `${dateContext}의 루틴`;
    elements.completionRateLabel.textContent = `${dateContext}의 달성률`;
    elements.progressDate.textContent = selectedDate === today ? "오늘" : `${selected.getMonth() + 1}월 ${selected.getDate()}일`;
    elements.routineCount.textContent = String(total);
    elements.completedCount.textContent = String(completed);
    elements.completionRate.textContent = String(rate);
    elements.streakCount.textContent = String(getStreak(selectedDate));
    elements.completedCaption.textContent = total === 0 ? "등록된 루틴이 없어요" : `${total}개 중 ${completed}개 완료`;
    elements.rateCaption.textContent = total === 0 ? "루틴을 추가해 시작해 보세요" : rate === 100 ? "모든 루틴을 완료했어요" : `${remaining}개 루틴이 남아 있어요`;
    elements.progressPercent.textContent = `${rate}%`;
    elements.progressSummaryText.textContent = total === 0 ? "루틴을 추가해 시작해 보세요" : completed === total ? "오늘의 루틴을 모두 완료했어요" : `${total}개 중 ${completed}개를 완료했어요`;
    elements.progressDone.textContent = String(completed);
    elements.progressLeft.textContent = String(remaining);
    elements.progressFill.style.width = `${rate}%`;
    elements.progressBar.setAttribute("aria-valuenow", String(rate));
    elements.progressBar.setAttribute("aria-label", `${dateContext} 루틴 달성률`);
    elements.progressTip.textContent = getProgressTip(total, completed, rate, dateContext);
    elements.previousDay.disabled = selectedDate <= "2000-01-01";
    elements.nextDay.disabled = selectedDate >= today;
  }

  function getProgressTip(total, completed, rate, dateContext) {
    if (total === 0) return "루틴을 추가하면 오늘의 진행 상황을 볼 수 있어요.";
    if (rate === 100) return `${dateContext}의 약속을 모두 지켰어요. 정말 멋진 흐름이에요.`;
    if (completed === 0) return "작은 루틴 하나부터 체크해 볼까요?";
    return `지금까지 ${completed}개를 완료했어요. 다음 루틴도 이어가 봐요.`;
  }

  // 최근 7일의 실제 완료 기록을 바탕으로 완료율 그래프를 갱신합니다.
  function renderChart() {
    const labels = [];
    const rates = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const dateKey = shiftDate(selectedDate, -offset);
      const date = dateFromKey(dateKey);
      labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
      rates.push(getCompletionRate(getRoutinesForDate(dateKey), dateKey));
    }
    if (typeof window.Chart !== "function") {
      elements.chartFootnote.textContent = "그래프를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.";
      return;
    }
    elements.chartFootnote.textContent = "날짜별 완료 기록을 바탕으로 계산해요.";
    const context = document.getElementById("weekly-chart").getContext("2d");
    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = rates;
      chart.update();
      return;
    }
    chart = new window.Chart(context, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "완료율",
          data: rates,
          borderColor: "#2d9b72",
          backgroundColor: (chartContext) => {
            const { chart: currentChart } = chartContext;
            const gradient = currentChart.ctx.createLinearGradient(0, 0, 0, currentChart.height);
            gradient.addColorStop(0, "rgba(45, 155, 114, .19)");
            gradient.addColorStop(1, "rgba(45, 155, 114, 0)");
            return gradient;
          },
          fill: true,
          tension: 0.38,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#2d9b72",
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => ` 완료율 ${item.raw}%` } } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: "#98a5a7", font: { family: "DM Sans", size: 9 }, maxRotation: 0 } },
          y: { min: 0, max: 100, ticks: { stepSize: 50, callback: (value) => `${value}%`, color: "#a0abad", font: { family: "DM Sans", size: 9 }, padding: 8 }, grid: { color: "#edf1ef", drawTicks: false }, border: { display: false } }
        }
      }
    });
  }

  // 최근 기록으로 실천 흐름과 가장 보완할 루틴을 안내합니다.
  function renderFeedback(routines) {
    const completed = getCompletedCount(routines, selectedDate);
    const rate = getCompletionRate(routines, selectedDate);
    const selected = dateFromKey(selectedDate);
    const dateContext = selectedDate === today ? "오늘" : `${selected.getMonth() + 1}월 ${selected.getDate()}일`;
    const logged = routines.filter((routine) => routine.completedDates.length > 0);
    if (routines.length === 0) {
      elements.feedbackLead.textContent = "루틴을 추가하면 나에게 맞는 인사이트를 확인할 수 있어요.";
      elements.feedbackLabel.textContent = "시작해 보기";
      elements.feedbackDetail.textContent = "부담 없는 습관 하나를 등록해 첫 기록을 남겨보세요.";
      return;
    }
    if (logged.length === 0) {
      elements.feedbackLead.textContent = "아직 완료 기록이 없어요. 첫 기록부터 쌓아 볼까요?";
      elements.feedbackLabel.textContent = `${dateContext}의 한 걸음`;
      elements.feedbackDetail.textContent = `${routines[0].name}부터 완료해 하루의 흐름을 시작해 보세요.`;
      return;
    }

    if (rate === 100) {
      elements.feedbackLead.textContent = `${dateContext} 등록한 루틴을 모두 실천했어요. 꾸준한 흐름이 만들어지고 있어요.`;
    } else if (rate >= 60) {
      elements.feedbackLead.textContent = `${dateContext} 루틴의 ${rate}%를 실천했어요. 지금 페이스를 이어가 보세요.`;
    } else {
      elements.feedbackLead.textContent = `${dateContext} ${completed}개를 완료했어요. 한 번에 하나씩 이어가면 충분해요.`;
    }

    const history = routines.map((routine) => {
      let opportunities = 0;
      let done = 0;
      for (let offset = 0; offset < 7; offset += 1) {
        const dateKey = shiftDate(selectedDate, -offset);
        if (routine.createdAt <= dateKey && (!routine.archivedAt || routine.archivedAt > dateKey)) {
          opportunities += 1;
          if (routine.completedDates.includes(dateKey)) done += 1;
        }
      }
      return { routine, opportunities, rate: opportunities ? done / opportunities : 1 };
    }).filter((item) => item.opportunities > 0);
    const needsAttention = history.filter((item) => item.rate < 1).sort((a, b) => a.rate - b.rate)[0];
    if (needsAttention) {
      const percent = Math.round(needsAttention.rate * 100);
      elements.feedbackLabel.textContent = "조금 더 챙겨볼 습관";
      elements.feedbackDetail.textContent = `최근 7일 동안 '${needsAttention.routine.name}' 실천율은 ${percent}%예요. 작게 시작해 꾸준히 이어가 보세요.`;
    } else {
      elements.feedbackLabel.textContent = "좋은 흐름이에요";
      elements.feedbackDetail.textContent = "최근 7일 동안 모든 루틴을 기록했어요. 지금의 리듬을 유지해 보세요.";
    }
  }

  function render() {
    const routines = getRoutinesForDate(selectedDate);
    renderStats(routines);
    renderRoutineList(routines);
    renderChart();
    renderFeedback(routines);
    elements.saveStatus.textContent = storageAvailable ? "이 기기에 저장됨" : "브라우저 저장 공간을 사용할 수 없음";
  }

  // 추가·수정 양식을 열고 기존 루틴이면 입력값을 채웁니다.
  function openForm(routine) {
    elements.form.reset();
    elements.routineId.value = routine ? routine.id : "";
    elements.dialogTitle.textContent = routine ? "루틴 수정" : "새 루틴 추가";
    document.getElementById("save-routine").textContent = routine ? "변경 저장" : "루틴 저장";
    document.getElementById("form-hint").textContent = routine
      ? "이름과 카테고리를 변경해도 이전 완료 기록은 유지돼요."
      : "루틴은 선택한 날짜부터 기록할 수 있어요.";
    if (routine) {
      elements.routineName.value = routine.name;
      elements.routineCategory.value = routine.category;
    }
    elements.dialog.showModal();
    elements.routineName.focus();
  }

  function closeForm() {
    elements.dialog.close();
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
  }

  function handleRoutineAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const routine = data.routines.find((item) => item.id === button.dataset.id);
    if (!routine) return;

    if (button.dataset.action === "toggle") {
      if (routine.completedDates.includes(selectedDate)) {
        routine.completedDates = routine.completedDates.filter((date) => date !== selectedDate);
      } else {
        routine.completedDates.push(selectedDate);
      }
      saveData();
      render();
      return;
    }
    if (button.dataset.action === "edit") {
      button.closest("details").open = false;
      openForm(routine);
      return;
    }
    if (button.dataset.action === "delete") {
      const confirmed = window.confirm(`'${routine.name}' 루틴과 완료 기록을 삭제할까요?`);
      if (!confirmed) return;
      data.routines = data.routines.filter((item) => item.id !== routine.id);
      saveData();
      render();
      showToast("루틴과 완료 기록을 삭제했어요.");
    }
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    const name = elements.routineName.value.trim();
    const category = elements.routineCategory.value;
    if (!name || !CATEGORIES.includes(category)) {
      elements.routineName.focus();
      return;
    }
    const routineId = elements.routineId.value;
    if (routineId) {
      const routine = data.routines.find((item) => item.id === routineId);
      if (!routine) {
        closeForm();
        showToast("루틴을 찾을 수 없어요. 목록을 다시 확인해 주세요.");
        return;
      }
      routine.name = name;
      routine.category = category;
      showToast("루틴을 수정했어요.");
    } else {
      data.routines.push({ id: makeId(), name, category, createdAt: selectedDate, archivedAt: null, completedDates: [] });
      showToast("새 루틴을 추가했어요.");
    }
    saveData();
    closeForm();
    render();
  }

  // 날짜와 필터, 루틴 관리 버튼의 동작을 연결합니다.
  function initialize() {
    document.querySelectorAll("[data-open-form]").forEach((button) => button.addEventListener("click", () => openForm(null)));
    document.getElementById("go-today").addEventListener("click", () => {
      selectedDate = today;
      render();
    });
    elements.previousDay.addEventListener("click", () => {
      selectedDate = shiftDate(selectedDate, -1);
      render();
    });
    elements.nextDay.addEventListener("click", () => {
      if (selectedDate < today) {
        selectedDate = shiftDate(selectedDate, 1);
        render();
      }
    });
    elements.categoryFilter.addEventListener("change", () => {
      categoryFilter = elements.categoryFilter.value;
      renderRoutineList(getRoutinesForDate(selectedDate));
    });
    elements.routineList.addEventListener("click", handleRoutineAction);
    elements.form.addEventListener("submit", handleFormSubmit);
    document.getElementById("close-dialog").addEventListener("click", closeForm);
    document.getElementById("cancel-dialog").addEventListener("click", closeForm);
    elements.dialog.addEventListener("click", (event) => {
      if (event.target === elements.dialog) closeForm();
    });
    document.querySelectorAll(".side-nav .nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        document.querySelectorAll(".side-nav .nav-link").forEach((item) => item.classList.remove("is-active"));
        link.classList.add("is-active");
      });
    });
    if (!storageAvailable) {
      elements.saveStatus.textContent = "브라우저 저장 공간을 사용할 수 없음";
      elements.saveStatus.closest(".sync-status").classList.add("is-error");
    }
    render();
  }
})();