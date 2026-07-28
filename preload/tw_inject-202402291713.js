function injectStyleCode(imageSrc, loading_btn) {
  const style = document.createElement("style")
  style.innerHTML = `
  .ytbcontentbnt_download,
  .ytbcontentbnt_download_active {
    position: absolute;
    height: 54px;
    width: 54px;
    right: 10px;
    bottom: 30px;
    border-radius: 50%;
    box-shadow: 1px 2px 21px -4px;
    background: url(${imageSrc}) no-repeat;
    background-size: contain;
    cursor: pointer;
    transition: all .3s;
    opacity: .8;
    z-index: 100000;
  }
  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  .ytbcontentbnt_download_active {
    background: url(${loading_btn}) no-repeat;
    animation: rotate 3s linear infinite;
    background-size: cover;
  }
  .ytbcontentbnt_download:hover,
  .ytbcontentbnt_download_active:hover {
    transform: scale(1.1);
    opacity: 1;
  }
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background-color: transparent;
  }
  ::-webkit-scrollbar-button {
    background-color: transparent;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background-color: transparent;
  }
  ::-webkit-scrollbar-button {
    background-color: transparent;
  }
  `
  document.head.appendChild(style)
}

window.injectStyleCode = injectStyleCode

var realXhr = "RealXMLHttpRequest";
var myHook = {
  hookAjax: function (proxy) {
    window[realXhr] = window[realXhr] || XMLHttpRequest;

    function getterFactory(attr) {
      return function () {
        var v = this.hasOwnProperty(attr + "_") ? this[attr + "_"] : this.xhr[attr];
        var attrGetterHook = (proxy[attr] || {})["getter"];
        return attrGetterHook && attrGetterHook(v, this) || v;
      }
    }

    function setterFactory(attr) {
      return function (v) {
        var xhr = this.xhr;
        var that = this;
        var hook = proxy[attr];
        if (typeof hook === "function") {
          xhr[attr] = function () {
            proxy[attr](that) || v?.apply(xhr, arguments);
          }
        } else {
          var attrSetterHook = (hook || {})["setter"];
          v = attrSetterHook && attrSetterHook(v, that) || v;
          try {
            xhr[attr] = v;
          } catch (e) {
            this[attr + "_"] = v;
          }
        }
      }
    }

    function hookFunction(fun) {
      return function () {
        var args = [].slice.call(arguments);
        if (proxy[fun] && proxy[fun].call(this, args, this.xhr)) {
          return;
        }
        return this.xhr[fun].apply(this.xhr, args);
      }
    }

    XMLHttpRequest = function () {
      var xhr = new window[realXhr];

      for (var attr in xhr) {
        var type = "";
        try {
          type = typeof xhr[attr];
        } catch (e) {
        }
        if (type === "function") {
          this[attr] = hookFunction(attr);
        } else {
          Object.defineProperty(this, attr, {
            get: getterFactory(attr),
            set: setterFactory(attr),
            enumerable: true
          });
        }
      }
      this.xhr = xhr;
    }

  },

  unHookAjax: function () {
    if (window[realXhr]) {
      XMLHttpRequest = window[realXhr];
    }
    window[realXhr] = undefined;
  }
};

window.myHook = myHook;


class TwitterParse {

  constructor() {
    this.currentVideoDom = null
    this.videoDataMap = {}
    this.dataArr = []
    this.currentVideoId = undefined
    this.videoIdRegex = /\/(\w+)\/pl|\/ext_tw_video\/(\d+)\//,
    this.regex = /\d+/
  }

  init() {
    this.startGetDom()
    this.startGetUrlM3u8()
  }


  startGetDom() {
    setInterval(() => {
      const videoList = document.querySelectorAll("video")
      videoList.forEach((item, idx) => {
        this.createDom(item, idx)
        item.addEventListener("play", () => {
          console.log({ currentVideoDom: this.currentVideoDom })
          this.currentVideoDom = item
        })
        item.addEventListener("ended", () => {
          if (this.videoDataMap[item.poster]) {
            this.videoDataMap[item.poster].isFinish = true
          }
        })
      })
    }, 1000)
  }

  getParent(max) {
    let index = 0;
    let maxCheck = (max && max > 0) ? max : 100;

    function getP(child, fn) {
      index++;
      if (index >= maxCheck) {
        return null;
      }
      let parentNode = child.parentNode;
      if (parentNode) {
        if (fn(parentNode)) {
          return parentNode
        } else {
          return getP(parentNode, fn);
        }
      }
    }
    return getP
  }

  startGetUrlM3u8() {
    const self = this
    myHook.hookAjax({
      onreadystatechange: function (xhr) {
        var VIDEO_SUFFIX = '.m3u8';
        if (xhr.responseURL.indexOf(VIDEO_SUFFIX) > -1) {
          console.log('xhr.responseURL = ', xhr.responseURL);
          const videoId = self.getVideoId(["ext_tw_video", "amplify_video"], xhr.responseURL);
          console.log({ href: location.href, videoId })
          if (location.href.includes("/status/")) {
            self.currentVideoId ??= videoId
            console.log({ currentVideoId: self.currentVideoId })
          } else {
            self.currentVideoId = undefined
          }
          self.videoDataMap[videoId]
            ? self.videoDataMap[videoId].push(xhr.responseURL)
            : self.videoDataMap[videoId] = [xhr.responseURL]
        }
      }
    });
  }

  getVideoId(key, url) {
    while(key.length > 0) {
      const ckey = key.shift()
      if (url.includes(ckey)) {
        let arr = url.split("/")
        const idx = arr.indexOf(ckey)
        if (idx > -1) {
          return arr[idx + 1]
        }
      }
    }
    return ""
  }

  createDom(dom, idx) {
    if (dom.getAttribute("flag")) {
      return
    }
    const div = document.createElement("div")
    div.className = "ytbcontentbnt_download"
    if (location.href.includes("/status/") && idx === 0) {
      console.log({ currentVideoId: this.currentVideoId })
      div.setAttribute("download_id", this.currentVideoId)
      div.setAttribute("data-idx", idx)
    } else {
      console.log({ poster: dom.poster })
      let match = this.getVideoId(["ext_tw_video_thumb"], dom.poster);
      div.setAttribute("download_id", match ?? "")
    }
    div.setAttribute("download_url", dom.poster)
    div.style.zIndex = 999
    div.addEventListener("click", this.handleClick.bind(this))
    const getP = this.getParent()(dom, (d) => {
      return d.getAttribute("aria-labelledby")
    })
    console.log({ getP })
    if (!getP.querySelector(".download")) {
      dom.setAttribute("flag", '1')
      getP.appendChild(div)
    }
  }

  getTitleAndDesc(dom) {
    const p = this.getParent()(dom, (d) => {
      return d.getAttribute("role") === "article"
    })
    const author = p.querySelector("[data-testid='User-Name'] a span").innerText
    const title = p.querySelector("[data-testid='tweetText'] span")
      ? p.querySelector("[data-testid='tweetText'] span").innerText
      : '(Empty)'
    console.log("getTitle", author, title)
    return {
      title,
      author
    }
  }

  handleClick(e) {
    e.target.classList.add("ytbcontentbnt_download_active")
    console.log("handleClick", { x: e.clientX, y: e.clientY })
    let videoId = e.target.getAttribute("download_id")
    console.log({ videoId })
    if (e.target.getAttribute("data-idx") == 0) {
      videoId = this.currentVideoId
    }
    if (videoId) {
      const { author, title } = this.getTitleAndDesc(e.target)
      console.log({ key: videoId })
      console.log({ videoDataMap: this.videoDataMap })
      console.log({ soutce: this.videoDataMap[videoId] })
      if (this.videoDataMap[videoId]) {
        $native.send("download", {
          cover: e.target.getAttribute("download_url"),
          cover_l: e.target.getAttribute("download_url"),
          th_id: videoId,
          author,
          title,
          url: Array.from(new Set(this.videoDataMap[videoId].filter(item => !item.includes("avc1"))))[0],
          position: { x: e.clientX + 210, y: e.clientY + 70 }
        })
        e.stopPropagation();
        e.target.classList.remove("ytbcontentbnt_download_active")
        return false
      } else {
        e.target.classList.remove("ytbcontentbnt_download_active")
        $native.send("not_found")
      }
    }
  }

}
new TwitterParse().init()
