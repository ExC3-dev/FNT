javascript:(function() {
    if (window.__networkTab) {
        document.body.removeChild(window.__networkTab);
        delete window.__networkTab;
        return;
    }

    let container = document.createElement("div");
    container.style = "position:fixed;bottom:10px;right:10px;width:450px;height:300px;overflow:auto;background:black;color:white;border:1px solid white;padding:10px;z-index:99999;font-family:monospace;font-size:12px;";
    container.innerHTML = "<h4>Network Monitor</h4><table style='width:100%;border-collapse:collapse;' id='networkLog'><tr><th>Method</th><th>URL</th><th>Status</th><th>Time</th><th>Copy</th></tr></table>";

    document.body.appendChild(container);
    window.__networkTab = container;

    function logRequest(method, url, status, time, curlCommand) {
        if (!url || !url.startsWith("http")) return;  // Ignore invalid URLs

        let row = document.createElement("tr");
        row.innerHTML = `<td>${method}</td><td title="${url}">${url.slice(0, 30)}...</td><td>${status}</td><td>${time}ms</td><td><button>📋</button></td>`;
        row.querySelector("button").onclick = () => {
            navigator.clipboard.writeText(curlCommand);
            alert("Copied cURL command!");
        };
        document.getElementById("networkLog").appendChild(row);
    }

    function generateCurl(method, url, headers = {}, body = null) {
        if (!url || !url.startsWith("http")) return ""; // Ensure valid URL

        let headerString = Object.entries(headers)
            .map(([k, v]) => `-H "${k}: ${v}"`)
            .join(" ");
        let bodyString = body ? `--data '${body.replace(/'/g, "\\'")}'` : "";
        return `curl -X ${method} "${url}" ${headerString} ${bodyString}`;
    }

    let originalFetch = window.fetch;
    window.fetch = function (...args) {
        let startTime = performance.now();
        return originalFetch.apply(this, args).then(response => {
            response.clone().text().then(body => {
                logRequest(
                    args[1]?.method || "GET",
                    response.url,
                    response.status,
                    Math.round(performance.now() - startTime),
                    generateCurl(args[1]?.method || "GET", response.url, args[1]?.headers || {}, body)
                );
            });
            return response;
        });
    };

    let originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._url = url;
        this._method = method;
        originalXHR.apply(this, [method, url, ...rest]);
    };
