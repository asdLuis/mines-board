window.XpCalc = (function () {

  // Total XP orbs/points needed to go from level 0 to level n
  // (Minecraft XP ladder formula).
  function totalXpForLevel(n) {
    n = Math.max(0, Math.floor(Number(n) || 0));

    if (n <= 16) {
      return n * n + 6 * n;
    }

    if (n <= 31) {
      return Math.round(2.5 * n * n - 40.5 * n + 360);
    }

    return Math.round(4.5 * n * n - 162.5 * n + 2220);
  }

  // XP cost to advance from level l to l+1.
  function costToNext(l) {
    l = Math.max(0, Math.floor(Number(l) || 0));

    if (l <= 15) {
      return 2 * l + 7;
    }

    if (l <= 30) {
      return 5 * l - 38;
    }

    return 9 * l - 158;
  }

  // Highest level whose total-XP requirement is at most xp.
  // The ladder is strictly increasing, so a binary search inverts it exactly.
  function levelForXp(xp) {
    xp = Math.max(0, Math.floor(Number(xp) || 0));

    let lo = 0;
    let hi = Math.max(
      64,
      Math.ceil(Math.sqrt(xp / 4.5)) + 32
    );

    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;

      if (totalXpForLevel(mid) <= xp) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }

    return lo;
  }

  return {
    totalXpForLevel,
    costToNext,
    levelForXp
  };
})();