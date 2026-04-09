(() => {
  const $ = (id) => document.getElementById(id);

  const defaultOrigin = `${window.location.origin}`;
  $('graphqlUrl').value = `${defaultOrigin}/graphql`;
  $('healthUrl').value = `${defaultOrigin}/health`;

  function headers() {
    const h = { 'Content-Type': 'application/json' };
    const key = $('apiKey').value.trim();
    if (key) {
      h['X-Api-Key'] = key;
    }
    return h;
  }

  async function gql(query, variables) {
    const url = $('graphqlUrl').value.trim() || `${defaultOrigin}/graphql`;
    const res = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ query, variables: variables ?? undefined }),
    });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    return { status: res.status, body };
  }

  function reveal(outEl) {
    outEl.classList.remove('muted');
    outEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function showResult(outEl, label, { status, body }) {
    const err = body.errors?.length || (status >= 400 && !body.data);
    outEl.className = `response-out ${err ? 'err' : 'ok'}`;
    outEl.textContent = `${label}\nHTTP ${status}\n\n${JSON.stringify(body, null, 2)}`;
    reveal(outEl);
  }

  function showErr(outEl, label, e) {
    outEl.className = 'response-out err';
    outEl.textContent = `${label}\n${e?.message ?? String(e)}`;
    reveal(outEl);
  }

  $('btnPing').onclick = async () => {
    const out = $('outConnection');
    try {
      const r = await gql(`{ ping }`);
      showResult(out, 'ping', r);
    } catch (e) {
      showErr(out, 'ping', e);
    }
  };

  $('btnHealth').onclick = async () => {
    const out = $('outConnection');
    try {
      const url = $('healthUrl').value.trim();
      const res = await fetch(url, { headers: headers() });
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      out.className = `response-out ${res.ok ? 'ok' : 'err'}`;
      out.textContent = `GET /health\nHTTP ${res.status}\n\n${typeof body === 'string' ? body : JSON.stringify(body, null, 2)}`;
      reveal(out);
    } catch (e) {
      showErr(out, 'health', e);
    }
  };

  $('btnIngest').onclick = async () => {
    const out = $('outIngest');
    try {
      const rows = JSON.parse($('ingestJson').value || '[]');
      const r = await gql(
        `mutation Ingest($input: IngestHcmBatchInput!) {
          ingestHcmBatch(input: $input) { employeeId locationId daysRemaining lastSyncedAt }
        }`,
        { input: { rows } },
      );
      showResult(out, 'ingestHcmBatch', r);
    } catch (e) {
      showErr(out, 'ingestHcmBatch', e);
    }
  };

  $('btnBalances').onclick = async () => {
    const out = $('outBalances');
    try {
      const employeeId = $('qEmployee').value.trim();
      const r = await gql(
        `query B($e: ID!) { balances(employeeId: $e) { employeeId locationId daysRemaining lastSyncedAt } }`,
        { e: employeeId },
      );
      showResult(out, 'balances', r);
    } catch (e) {
      showErr(out, 'balances', e);
    }
  };

  $('btnBalanceOne').onclick = async () => {
    const out = $('outBalances');
    try {
      const r = await gql(
        `query One($e: ID!, $l: ID!) {
          balance(employeeId: $e, locationId: $l) { employeeId locationId daysRemaining lastSyncedAt }
        }`,
        {
          e: $('qEmployee').value.trim(),
          l: $('qLocation').value.trim(),
        },
      );
      showResult(out, 'balance', r);
    } catch (e) {
      showErr(out, 'balance', e);
    }
  };

  $('btnCreate').onclick = async () => {
    const out = $('outRequest');
    try {
      const input = {
        employeeId: $('cEmployee').value.trim(),
        locationId: $('cLocation').value.trim(),
        startDate: $('cStart').value.trim(),
        endDate: $('cEnd').value.trim(),
        requestedDays: parseFloat($('cDays').value, 10),
        idempotencyKey: $('cIdem').value.trim() || null,
      };
      const r = await gql(
        `mutation C($input: CreateTimeOffInput!) {
          createTimeOffRequest(input: $input) {
            id status requestedDays startDate endDate employeeId locationId
          }
        }`,
        { input },
      );
      showResult(out, 'createTimeOffRequest', r);
      if (r.body?.data?.createTimeOffRequest?.id) {
        $('reqId').value = r.body.data.createTimeOffRequest.id;
      }
    } catch (e) {
      showErr(out, 'createTimeOffRequest', e);
    }
  };

  $('btnSubmit').onclick = async () => {
    const out = $('outRequest');
    try {
      const id = $('reqId').value.trim();
      const r = await gql(
        `mutation S($id: ID!) { submitTimeOffRequest(id: $id) { id status } }`,
        { id },
      );
      showResult(out, 'submitTimeOffRequest', r);
    } catch (e) {
      showErr(out, 'submitTimeOffRequest', e);
    }
  };

  $('btnCancel').onclick = async () => {
    const out = $('outRequest');
    try {
      const id = $('reqId').value.trim();
      const r = await gql(
        `mutation($id: ID!) { cancelTimeOffRequest(id: $id) { id status } }`,
        { id },
      );
      showResult(out, 'cancelTimeOffRequest', r);
    } catch (e) {
      showErr(out, 'cancelTimeOffRequest', e);
    }
  };

  $('btnPending').onclick = async () => {
    const out = $('outManager');
    try {
      const loc = $('pendingLoc').value.trim();
      const r = await gql(
        `query($loc: ID) {
          pendingTimeOffRequests(locationId: $loc) { id status employeeId locationId requestedDays }
        }`,
        { loc: loc || null },
      );
      showResult(out, 'pendingTimeOffRequests', r);
    } catch (e) {
      showErr(out, 'pendingTimeOffRequests', e);
    }
  };

  $('btnApprove').onclick = async () => {
    const out = $('outManager');
    try {
      const id = $('managerReqId').value.trim();
      if (!id) {
        showErr(
          out,
          'approveTimeOffRequest',
          new Error(
            'Paste a request id from the pendingTimeOffRequests response into "Request ID to approve or reject".',
          ),
        );
        return;
      }
      const r = await gql(
        `mutation($id: ID!) { approveTimeOffRequest(id: $id) { id status } }`,
        { id },
      );
      showResult(out, 'approveTimeOffRequest', r);
    } catch (e) {
      showErr(out, 'approveTimeOffRequest', e);
    }
  };

  $('btnReject').onclick = async () => {
    const out = $('outManager');
    try {
      const id = $('managerReqId').value.trim();
      if (!id) {
        showErr(
          out,
          'rejectTimeOffRequest',
          new Error(
            'Paste a request id from the pendingTimeOffRequests response into "Request ID to approve or reject".',
          ),
        );
        return;
      }
      const r = await gql(
        `mutation($id: ID!) { rejectTimeOffRequest(id: $id) { id status } }`,
        { id },
      );
      showResult(out, 'rejectTimeOffRequest', r);
    } catch (e) {
      showErr(out, 'rejectTimeOffRequest', e);
    }
  };

  $('btnGetReq').onclick = async () => {
    const out = $('outRequest');
    try {
      const id = $('reqId').value.trim();
      const r = await gql(
        `query($id: ID!) { timeOffRequest(id: $id) { id status employeeId locationId requestedDays startDate endDate } }`,
        { id },
      );
      showResult(out, 'timeOffRequest', r);
    } catch (e) {
      showErr(out, 'timeOffRequest', e);
    }
  };

  $('btnListReq').onclick = async () => {
    const out = $('outBalances');
    try {
      const employeeId = $('qEmployee').value.trim();
      const r = await gql(
        `query($e: ID!) { timeOffRequests(employeeId: $e) { id status requestedDays } }`,
        { e: employeeId },
      );
      showResult(out, 'timeOffRequests', r);
    } catch (e) {
      showErr(out, 'timeOffRequests', e);
    }
  };
})();
