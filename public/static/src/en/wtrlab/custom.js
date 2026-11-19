/**
 * WTR-LAB interactive term preferences popup for LNReader.
 */
(function () {
  'use strict';

  if (window.__wtrlabInitialized) return;
  window.__wtrlabInitialized = true;

  var currentModal = null;

  function closeModal() {
    if (!currentModal) return;
    var backdrop = currentModal;
    currentModal = null;
    backdrop.classList.remove('wtr-visible');
    setTimeout(function () {
      if (backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
    }, 180);
  }

  function updateDomTerms(hash, newTranslation) {
    if (!hash || !newTranslation) return;
    var patches = document.querySelectorAll('.text-patch');
    for (var p of patches) {
      if (p.getAttribute('data-hash') === hash) {
        p.textContent = newTranslation;
        p.setAttribute('data-target', newTranslation);
      }
    }
  }

  function formatCount(count) {
    if (typeof count !== 'number' || count <= 0) return '0';
    if (count > 99) return '99+';
    return String(count);
  }

  function fetchPreferences(sourceId, hash) {
    if (!hash || !hash.trim()) return Promise.resolve([]);
    var primarySource = sourceId || 'id.generic.17';

    function queryEndpoint(src) {
      var url =
        'https://wtr-lab.com/api/v2/term-preferences?source_id=' +
        encodeURIComponent(src) +
        '&hash=' +
        encodeURIComponent(hash) +
        '&lang=en';
      return fetch(url)
        .then(function (res) {
          return res.ok ? res.json() : null;
        })
        .then(function (res) {
          return res && Array.isArray(res.data) ? res.data : [];
        })
        .catch(function () {
          return [];
        });
    }

    return queryEndpoint(primarySource).then(function (data) {
      if (data && data.length > 0) return data;
      if (primarySource !== 'id.generic.17') {
        return queryEndpoint('id.generic.17');
      }
      return [];
    });
  }

  function fetchGoogleTranslate(hash) {
    if (!hash || !hash.trim()) return Promise.resolve(null);
    return fetch('https://translate-pa.googleapis.com/v1/translateHtml', {
      method: 'POST',
      credentials: 'omit',
      headers: {
        'content-type': 'application/json+protobuf',
        'X-Goog-API-Key': 'AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520',
      },
      // Note: referrer: 'https://wtr-lab.com/' causes TypeError in file:/// or localhost WebViews, but is kept here for reference.
      // referrer: 'https://wtr-lab.com/',
      body: JSON.stringify([[[hash.trim()], 'zh-CN', 'en'], 'te_lib']),
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (res) {
        if (
          res &&
          res[0] &&
          Array.isArray(res[0]) &&
          typeof res[0][0] === 'string'
        ) {
          return res[0][0].trim();
        }
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  function positionCard(card, targetEl) {
    var rect = targetEl.getBoundingClientRect();
    var cardRect = card.getBoundingClientRect();
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;

    var left = rect.left;
    if (left + cardRect.width > viewportWidth - 12) {
      left = viewportWidth - cardRect.width - 12;
    }
    if (left < 12) left = 12;

    var top = rect.bottom + 8;
    var origin = 'top left';
    if (top + cardRect.height > viewportHeight - 12) {
      if (rect.top > cardRect.height + 8) {
        top = rect.top - cardRect.height - 8;
        origin = 'bottom left';
      } else {
        top = Math.max(12, viewportHeight - cardRect.height - 12);
      }
    }
    if (top < 12) top = 12;

    card.style.left = left + 'px';
    card.style.top = top + 'px';
    card.style.transformOrigin = origin;
  }

  var GOOGLE_TRANSLATE_SVG =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="7" y="2" width="15" height="15" rx="3" fill="#1A73E8"/>' +
    '<path d="M14.5 4.5v1.2M11.5 6.7h6M16.2 7.7c-.8 1.8-2.2 3.3-3.7 4.1M13.8 8c.7 1.2 2.1 2.8 4 3.6" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round"/>' +
    '<rect x="2" y="7" width="15" height="15" rx="3" fill="#FFFFFF"/>' +
    '<path d="M9.5 13.5v-1.8h3.3c-.2 1.3-.9 2.2-2.1 2.2-1.5 0-2.6-1.1-2.6-2.6s1.1-2.6 2.6-2.6c.8 0 1.4.3 1.8.7l1.2-1.2C13 7.5 11.9 7 10.7 7 8 7 6 9 6 11.3s2 4.3 4.7 4.3c2.4 0 4-1.6 4-4 0-.4 0-.8-.1-1.1H9.5z" fill="#4285F4"/>' +
    '</svg>';

  function openPreferenceModal(targetEl) {
    var contentRoot = targetEl.closest('.wtr-chapter-content');
    if (
      contentRoot &&
      contentRoot.getAttribute('data-popup-enabled') === 'false'
    ) {
      return;
    }

    closeModal();

    var popupStyle =
      (contentRoot ? contentRoot.getAttribute('data-popup-style') : '') || 'a2';
    if (popupStyle !== 'a2' && popupStyle !== 'c2' && popupStyle !== 'c3') {
      popupStyle = 'a2';
    }

    var hash = targetEl.getAttribute('data-hash') || '';
    var activeTarget =
      targetEl.getAttribute('data-target') || targetEl.textContent.trim();
    var aiTarget = targetEl.getAttribute('data-ai-target') || activeTarget;
    var sourceId =
      targetEl.getAttribute('data-source-id') ||
      (contentRoot ? contentRoot.getAttribute('data-source-id') : '') ||
      '';

    var backdrop = document.createElement('div');
    backdrop.className = 'wtr-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Term translation preferences');

    var card = document.createElement('div');
    card.className = 'wtr-card wtr-style-' + popupStyle;

    var header = document.createElement('div');
    header.className = 'wtr-header';

    var fromGroup = document.createElement('div');
    fromGroup.className = 'wtr-from-group';

    var labelFrom = document.createElement('span');
    labelFrom.className = 'wtr-label-from';
    labelFrom.textContent = 'From:';

    var termFrom = document.createElement('span');
    termFrom.className = 'wtr-term-from';
    termFrom.title = hash || activeTarget;
    termFrom.textContent = hash || activeTarget;

    fromGroup.appendChild(labelFrom);
    fromGroup.appendChild(termFrom);
    header.appendChild(fromGroup);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'wtr-close-btn';
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', 'Close preferences');
    closeBtn.innerHTML = '&#10005;';
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeModal();
    });
    header.appendChild(closeBtn);
    card.appendChild(header);

    var labelTo = document.createElement('div');
    labelTo.className = 'wtr-label-to';
    labelTo.textContent = 'To:';
    card.appendChild(labelTo);

    var listContainer = document.createElement('div');
    listContainer.className = 'wtr-options-list';
    listContainer.innerHTML =
      '<div class="wtr-pill-skeleton"></div><div class="wtr-pill-skeleton"></div>';
    card.appendChild(listContainer);

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
    currentModal = backdrop;

    positionCard(card, targetEl);

    requestAnimationFrame(function () {
      backdrop.classList.add('wtr-visible');
    });

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) {
        closeModal();
      }
    });

    var prefPromise = fetchPreferences(sourceId, hash);
    var googlePromise = fetchGoogleTranslate(hash);

    Promise.all([prefPromise, googlePromise]).then(function (results) {
      if (backdrop !== currentModal) return;
      var candidates = results[0] || [];
      var googleTrans = results[1] || null;
      renderOptions(
        listContainer,
        candidates,
        googleTrans,
        activeTarget,
        aiTarget,
        hash,
        popupStyle,
      );
      positionCard(card, targetEl);
    });
  }

  function renderOptions(
    container,
    candidates,
    googleTrans,
    activeTarget,
    aiTarget,
    hash,
    popupStyle,
  ) {
    container.innerHTML = '';

    var normAi = (aiTarget || '').trim().toLowerCase();
    var normActive = (activeTarget || '').trim().toLowerCase();
    var normGt = (googleTrans || '').trim().toLowerCase();

    var options = [];

    candidates.forEach(function (c) {
      if (c && typeof c.to === 'string' && c.to.trim()) {
        var toText = c.to.trim();
        var count = typeof c.userCount === 'number' ? c.userCount : 1;
        var isAi = toText.toLowerCase() === normAi;
        options.push({
          to: toText,
          count: count,
          isAi: isAi,
          isActive: toText.toLowerCase() === normActive,
          isGoogle: false,
        });
      }
    });

    var hasAiOption = options.some(function (opt) {
      return opt.isAi;
    });
    if (aiTarget && !hasAiOption) {
      options.unshift({
        to: aiTarget.trim(),
        count: 0,
        isAi: true,
        isActive: normAi === normActive,
        isGoogle: false,
      });
    }

    var hasActiveOption = options.some(function (opt) {
      return opt.to.toLowerCase() === normActive;
    });
    if (activeTarget && !hasActiveOption && normActive !== normGt) {
      options.push({
        to: activeTarget.trim(),
        count: 0,
        isAi: normActive === normAi,
        isActive: true,
        isGoogle: false,
      });
    }

    options.sort(function (a, b) {
      return b.count - a.count;
    });

    options = options.slice(0, 5);

    if (googleTrans && googleTrans.trim()) {
      var gtText = googleTrans.trim();
      var gtKey = normGt;
      var hasActiveCandidate = options.some(function (opt) {
        return opt.isActive;
      });
      options.push({
        to: gtText,
        count: 0,
        isAi: false,
        isActive: !hasActiveCandidate && gtKey === normActive,
        isGoogle: true,
      });
    }

    if (options.length === 0) {
      container.innerHTML =
        '<div class="wtr-empty">No translations found</div>';
      return;
    }

    options.forEach(function (opt) {
      var row = document.createElement('div');
      row.className =
        'wtr-option-row' + (opt.isActive ? ' wtr-row-active' : '');
      row.title = opt.to;
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-pressed', opt.isActive ? 'true' : 'false');

      var leftWrap = document.createElement('div');
      leftWrap.style.display = 'flex';
      leftWrap.style.alignItems = 'center';
      leftWrap.style.minWidth = '0';
      leftWrap.style.flex = '1';

      if (popupStyle === 'a2') {
        var radioCircle = document.createElement('span');
        radioCircle.className = 'wtr-radio-circle';
        leftWrap.appendChild(radioCircle);
      }

      var textEl = document.createElement('span');
      textEl.className = 'wtr-term-txt';
      textEl.textContent = opt.to;
      leftWrap.appendChild(textEl);
      row.appendChild(leftWrap);

      if (opt.isGoogle) {
        var gtBadge = document.createElement('span');
        gtBadge.className = 'wtr-badge-google-translate';
        gtBadge.setAttribute('title', 'Google Translate');
        gtBadge.setAttribute('aria-label', 'Google Translate');
        gtBadge.innerHTML = GOOGLE_TRANSLATE_SVG;
        row.appendChild(gtBadge);
      } else if (opt.isAi) {
        var segPill = document.createElement('div');
        segPill.className = 'wtr-segmented-pill';

        var segAi = document.createElement('span');
        segAi.className = 'wtr-seg-ai';
        segAi.textContent = 'AI';

        var segCount = document.createElement('span');
        segCount.className = 'wtr-seg-count';
        segCount.textContent = formatCount(opt.count);

        segPill.appendChild(segAi);
        segPill.appendChild(segCount);
        row.appendChild(segPill);
      } else {
        var slateBadge = document.createElement('span');
        slateBadge.className = 'wtr-badge-slate';
        slateBadge.textContent = formatCount(opt.count);
        row.appendChild(slateBadge);
      }

      function selectOption() {
        var siblings = container.querySelectorAll('.wtr-option-row');
        for (var sibling of siblings) {
          sibling.classList.remove('wtr-row-active');
          sibling.setAttribute('aria-pressed', 'false');
        }
        row.classList.add('wtr-row-active');
        row.setAttribute('aria-pressed', 'true');
        updateDomTerms(hash, opt.to);
        setTimeout(function () {
          closeModal();
        }, 150);
      }

      row.addEventListener('click', function (e) {
        e.stopPropagation();
        selectOption();
      });

      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          selectOption();
        }
      });

      container.appendChild(row);
    });
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    var patch = target && target.closest ? target.closest('.text-patch') : null;
    if (patch) {
      var contentRoot = patch.closest('.wtr-chapter-content');
      if (
        contentRoot &&
        contentRoot.getAttribute('data-popup-enabled') === 'false'
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      openPreferenceModal(patch);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      var target = e.target;
      var patch =
        target && target.closest ? target.closest('.text-patch') : null;
      if (patch) {
        var contentRoot = patch.closest('.wtr-chapter-content');
        if (
          contentRoot &&
          contentRoot.getAttribute('data-popup-enabled') === 'false'
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        openPreferenceModal(patch);
      }
    }
  });
})();
