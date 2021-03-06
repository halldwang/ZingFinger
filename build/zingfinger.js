(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ZingFinger = factory());
}(this, (function () { 'use strict';

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

//利用勾股定理公式就可以很容易的计算出斜边的长度，也就是手指触点之间的直线距离
var getLen = function getLen(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
};

var dot = function dot(v1, v2) {
  return v1.x * v2.x + v1.y * v2.y;
};

// 计算弧度
var getAngle = function getAngle(v1, v2) {
  var mr = getLen(v1) * getLen(v2);
  if (mr === 0) return 0;
  var r = dot(v1, v2) / mr;
  if (r > 1) r = 1;
  return Math.acos(r);
};

//利用cross结果的正负来判断旋转的方向,如果值大于0，表示方向是逆时针，值小于0，表示方向顺时针
var cross = function cross(v1, v2) {
  return v1.x * v2.y - v2.x * v1.y;
};

//利用数学向量求出旋转角度
var getRotateAngle = function getRotateAngle(v1, v2) {
  var angle = getAngle(v1, v2);
  if (cross(v1, v2) > 0) {
    angle *= -1;
  }
  return angle * 180 / Math.PI;
};

var getOffset = function getOffset(el) {
  var rect = el.getBoundingClientRect();
  var offset = {
    left: rect.left + document.body.scrollLeft,
    top: rect.top + document.body.scrollTop,
    width: el.offsetWidth,
    height: el.offsetHeight
  };
  return offset;
};

var getMidpoint = function getMidpoint(el) {
  if (!el) return { x: 0, y: 0 };
  var offset = getOffset(el);
  var x = offset.left + el.getBoundingClientRect().width / 2,
      y = offset.top + el.getBoundingClientRect().width / 2;
  return { x: Math.round(x), y: Math.round(y) };
};

var HandlerAdmin = function () {
  function HandlerAdmin(el) {
    classCallCheck(this, HandlerAdmin);

    this.handlers = [];
    this.el = el;
  }

  createClass(HandlerAdmin, [{
    key: "add",
    value: function add(handler) {
      this.handlers.push(handler);
    }
  }, {
    key: "del",
    value: function del(handler) {
      if (!handler) this.handlers = [];

      for (var i = this.handlers.length; i >= 0; i--) {
        if (this.handlers[i] === handler) {
          this.handlers.splice(i, 1);
        }
      }
    }
  }, {
    key: "dispatch",
    value: function dispatch() {
      for (var i = 0, len = this.handlers.length; i < len; i++) {
        var handler = this.handlers[i];
        if (typeof handler === "function") handler.apply(this.el, arguments);
      }
    }
  }]);
  return HandlerAdmin;
}();

var wrapEl = function wrapEl(el) {
  return typeof el == "string" ? document.querySelector(el) : el;
};
var wrapFunc = function wrapFunc(el, handler) {
  var handlerAdmin = new HandlerAdmin(el);
  handlerAdmin.add(handler);

  return handlerAdmin;
};

var isDescendant = function isDescendant(parent, child) {
  var node = child.parentNode;
  while (node != null) {
    if (node == parent) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
};

var ZingFinger = function () {
  //option是个数据对象，包含了所有的操作回调函数
  function ZingFinger(el, option, handleEl) {
    classCallCheck(this, ZingFinger);

    this.element = wrapEl(el);
    this.handleEl = wrapEl(handleEl);
    this.start = this.start.bind(this);
    this.move = this.move.bind(this);
    this.end = this.end.bind(this);
    this.cancel = this.cancel.bind(this);
    //监听touch事件
    this.element.addEventListener("touchstart", this.start, false);
    this.element.addEventListener("touchmove", this.move, false);
    this.element.addEventListener("touchend", this.end, false);
    this.element.addEventListener("touchcancel", this.cancel, false);

    //存储两个手指触摸点的位置的间距，水平间距和垂直间距
    this.preV = { x: null, y: null };
    //存储多指触摸操作时，手指触点位置之间的距离
    this.pinchStartLen = null;
    this.zoom = 1;
    this.isDoubleTap = false;

    var noop = function noop() {};

    //旋转操作（多指旋转操作）
    this.rotate = wrapFunc(this.element, option.rotate || noop);
    //旋转操作 (单指)
    this.singleRotate = wrapFunc(this.handleEl, option.singleRotate || noop);
    //手指触摸开始
    this.touchStart = wrapFunc(this.element, option.touchStart || noop);
    //多指触摸开始
    this.multipointStart = wrapFunc(this.element, option.multipointStart || noop);
    //多指触摸结束
    this.multipointEnd = wrapFunc(this.element, option.multipointEnd || noop);
    //捏（缩放操作）
    this.pinch = wrapFunc(this.element, option.pinch || noop);
    //单指缩放操作
    this.singlePinch = wrapFunc(this.handleEl, option.singlePinch || noop);
    //手指划过操作（兼容单个手指操作，多个手指操作）
    this.swipe = wrapFunc(this.element, option.swipe || noop);
    //点击操作
    this.tap = wrapFunc(this.element, option.tap || noop);
    //双击操作
    this.doubleTap = wrapFunc(this.element, option.doubleTap || noop);
    //长按操作
    this.longTap = wrapFunc(this.element, option.longTap || noop);
    //点击操作
    //tap操作和singleTap操作的区别在于，如果是在一定时间内只是单击一次的话，触发的操作顺序是tap->singleTap
    //singleTap操作其实就类似于鼠标click事件，click事件作用到移动端页面的时候，会存在延时触发事件，会先触发touch事件再执行click事件
    this.singleTap = wrapFunc(this.element, option.singleTap || noop);
    //单个手指触摸滑动操作
    this.pressMove = wrapFunc(this.element, option.pressMove || noop);
    //两个手指触摸滑动操作
    this.twoFingerPressMove = wrapFunc(this.element, option.twoFingerPressMove || noop);
    //触摸滑动
    this.touchMove = wrapFunc(this.element, option.touchMove || noop);
    //触摸结束，手指触点离开屏幕
    this.touchEnd = wrapFunc(this.element, option.touchEnd || noop);
    //系统原因中断手势操作
    this.touchCancel = wrapFunc(this.element, option.touchCancel || noop);

    this._cancelAllHandler = this.cancelAll.bind(this);

    window.addEventListener("scroll", this._cancelAllHandler);

    //手指连续按下触摸操作之间的时间间隔
    this.delta = null;
    //手指最近一次按下触摸操作时的时间戳
    this.last = null;
    //手指按下触摸操作的时间戳
    this.now = null;
    //接收点击操作时的定时器返回的值，用于清除定时器
    this.tapTimeout = null;
    //接收点击操作时的定时器返回的值，用于清除定时器
    this.singleTapTimeout = null;
    //接收长按操作时的定时器返回的值，用于清除定时器
    this.longTapTimeout = null;
    this.swipeTimeout = null;
    this.x1 = this.x2 = this.y1 = this.y2 = null;
    //用于存储手指触摸操作时的水平坐标和垂直坐标（如果是多指触摸操作，则记录的是第一个手指触摸的位置）
    this.preTapPosition = { x: null, y: null };
  }

  createClass(ZingFinger, [{
    key: "start",
    value: function start(evt) {
      if (!evt.touches) return;
      this.now = Date.now();
      //存储手指触点相对于HTML文档左边沿的的X坐标
      this.x1 = evt.touches[0].pageX;
      //存储手指触点相对于HTML文档上边沿的的Y坐标
      this.y1 = evt.touches[0].pageY;
      //计算出手指连续按下触摸操作之间的时间间隔
      this.delta = this.now - (this.last || this.now);
      this.touchStart.dispatch(evt, this.element);
      if (this.preTapPosition.x !== null) {
        //如果手指连续触摸操作之间的时间间隔小于250毫秒，且手指连续触摸操作之间的触点位置水平坐标小于30，
        //垂直坐标小于30，那么就判定该操作为双击操作
        this.isDoubleTap = this.delta > 0 && this.delta <= 250 && Math.abs(this.preTapPosition.x - this.x1) < 30 && Math.abs(this.preTapPosition.y - this.y1) < 30;
        if (this.isDoubleTap) clearTimeout(this.singleTapTimeout);
      }
      this.preTapPosition.x = this.x1;
      this.preTapPosition.y = this.y1;
      this.last = this.now;

      //获取触摸点的数量
      var preV = this.preV,
          len = evt.touches.length;
      if (len > 1) {
        this._cancelLongTap();
        this._cancelSingleTap();
        //如果是多手指操作的，计算出手指触摸点的位置的间距，水平间距和垂直间距
        var v = {
          x: evt.touches[1].pageX - this.x1,
          y: evt.touches[1].pageY - this.y1
        };
        preV.x = v.x;
        preV.y = v.y;

        //存储手指触点间的直线距离
        this.pinchStartLen = getLen(preV);
        this.multipointStart.dispatch(evt, this.element);
      }
      //判断操作是单击还是长按，true为长按操作，false为单击操作
      this._preventTap = false;
      //长按时的操作，长按时间750毫秒才会执行
      this.longTapTimeout = setTimeout(function () {
        this.longTap.dispatch(evt, this.element);
        this._preventTap = true;
      }.bind(this), 750);
    }
  }, {
    key: "move",
    value: function move(evt) {
      if (!evt.touches) return;
      var preV = this.preV,
          len = evt.touches.length,
          currentX = evt.touches[0].pageX,
          currentY = evt.touches[0].pageY;
      //手指滑动的时候，就可以判定当前的操作不是双击了，所以把双击操作的状态设为false
      this.isDoubleTap = false;
      //多个手指操作
      if (len > 1) {
        var sCurrentX = evt.touches[1].pageX,
            sCurrentY = evt.touches[1].pageY;
        var v = {
          x: evt.touches[1].pageX - currentX,
          y: evt.touches[1].pageY - currentY
        };
        //多指操作时，且触摸点位置的间距存在，也就是preV.x或者preV.y存在的时候才能执行pinch操作，这个判断条件必须存在
        //（因为可能存在当多个手指触摸屏幕时，那么存在多个触摸点，但是在滑动操作的同时，只保留了一个手指触摸点，其他手指移开屏幕这样的情况，这种情况就不能执行pinch操作
        if (preV.x !== null) {
          if (this.pinchStartLen > 0) {
            //计算出缩放比例（当前手指触摸点的直线距离 / 上一次滑动之前的手指触摸点的直线距离）
            // console.log(this.pinchStartLen);
            evt.zoom = getLen(v) / this.pinchStartLen;
            this.pinch.dispatch(evt, this.element);
          }
          //旋转手势操作
          evt.angle = getRotateAngle(v, preV);
          this.rotate.dispatch(evt, this.element);
        }
        preV.x = v.x;
        preV.y = v.y;

        if (this.x2 !== null && this.sx2 !== null) {
          evt.deltaX = (currentX - this.x2 + sCurrentX - this.sx2) / 2;
          evt.deltaY = (currentY - this.y2 + sCurrentY - this.sy2) / 2;
        } else {
          evt.deltaX = 0;
          evt.deltaY = 0;
        }
        this.twoFingerPressMove.dispatch(evt, this.element);

        //存储在移动操作时第二个手指的X坐标位置
        this.sx2 = sCurrentX;
        //存储在移动操作时第二个手指的Y坐标位置
        this.sy2 = sCurrentY;
      } else {
        if (this.x2 !== null) {
          evt.deltaX = currentX - this.x2;
          evt.deltaY = currentY - this.y2;

          //move事件中添加对当前触摸点到初始触摸点的判断，
          //如果曾经大于过某个距离(比如10),就认为是移动到某个地方又移回来，应该不再触发tap事件才对。
          var movedX = Math.abs(this.x1 - this.x2),
              movedY = Math.abs(this.y1 - this.y2);

          if (movedX > 10 || movedY > 10) {
            this._preventTap = true;
          }
        } else {
          evt.deltaX = 0;
          evt.deltaY = 0;
        }

        this.pressMove.dispatch(evt, this.element);
        // 判断是否有handleElement
        if (this.handleEl && isDescendant(this.element, this.handleEl) && this.handleEl.dataset.single == "true" && evt.target == this.handleEl) {
          var basePoint = getMidpoint(this.element);

          var startV = {
            x: this.handleEl.offsetLeft - this.handleEl.offsetWidth / 4,
            y: this.handleEl.offsetTop - this.handleEl.offsetHeight / 4
          };

          var rectV = {
            x: currentX - startV.x,
            y: currentY - startV.y
          };
          preV = {
            x: rectV.x - this.x1,
            y: rectV.y - this.y1
          };

          this.pinchStartLen = getLen(preV);
          evt.zoom = getLen(rectV) / this.pinchStartLen;
          // 单指缩放
          this.singlePinch.dispatch(evt, this.handleEl);

          // 单指旋转
          var rotateV2 = {
            x: basePoint.x - currentX,
            y: basePoint.y - currentY
          };

          evt.angle = getRotateAngle(rotateV2, preV);
          preV.x = rotateV2.x;
          preV.y = rotateV2.y;
          this.singleRotate.dispatch(evt, this.handleEl);
          // 是否为在handleElement上，禁止touch与屏幕滑动的冲突
          evt.preventDefault();
        }
      }

      this.touchMove.dispatch(evt, this.element);

      this._cancelLongTap();
      this.x2 = currentX;
      this.y2 = currentY;

      if (len > 1) {
        evt.preventDefault();
      }
    }
  }, {
    key: "end",
    value: function end(evt) {
      if (!evt.changedTouches) return;
      //清除长按操作的定时器，取消长按操作
      this._cancelLongTap();
      var self = this;
      if (evt.touches.length < 2) {
        this.multipointEnd.dispatch(evt, this.element);
        this.sx2 = this.sy2 = null;
      }

      //swipe
      //水平移动间距大于30或者垂直移动间距大于30，就判定为swipe操作
      if (this.x2 && Math.abs(this.x1 - this.x2) > 30 || this.y2 && Math.abs(this.y1 - this.y2) > 30) {
        evt.direction = this._swipeDirection(this.x1, this.x2, this.y1, this.y2);
        this.swipeTimeout = setTimeout(function () {
          self.swipe.dispatch(evt, self.element);
        }, 0);
      } else {
        this.tapTimeout = setTimeout(function () {
          if (!self._preventTap) {
            self.tap.dispatch(evt, self.element);
          }
          // trigger double tap immediately
          // 如果是双击操作的话，就执行
          if (self.isDoubleTap) {
            self.doubleTap.dispatch(evt, self.element);
            self.isDoubleTap = false;
          }
        }, 0);

        //如果不是双击操作，就会延时250毫秒执行singleTap操作，同时也会执行tap操作，执行顺序是tap->singleTap
        if (!self.isDoubleTap) {
          self.singleTapTimeout = setTimeout(function () {
            self.singleTap.dispatch(evt, self.element);
          }, 250);
        }
      }

      this.touchEnd.dispatch(evt, this.element);

      this.preV.x = 0;
      this.preV.y = 0;
      this.zoom = 1;
      this.pinchStartLen = null;
      this.x1 = this.x2 = this.y1 = this.y2 = null;
    }
  }, {
    key: "cancelAll",
    value: function cancelAll() {
      this._preventTap = true;
      clearTimeout(this.singleTapTimeout);
      clearTimeout(this.tapTimeout);
      clearTimeout(this.longTapTimeout);
      clearTimeout(this.swipeTimeout);
    }
  }, {
    key: "cancel",
    value: function cancel(evt) {
      this.cancelAll();
      this.touchCancel.dispatch(evt, this.element);
    }
  }, {
    key: "_cancelLongTap",
    value: function _cancelLongTap() {
      clearTimeout(this.longTapTimeout);
    }
  }, {
    key: "_cancelSingleTap",
    value: function _cancelSingleTap() {
      clearTimeout(this.singleTapTimeout);
    }
    //判定swipe滑动的方向

  }, {
    key: "_swipeDirection",
    value: function _swipeDirection(x1, x2, y1, y2) {
      return Math.abs(x1 - x2) >= Math.abs(y1 - y2) ? x1 - x2 > 0 ? "Left" : "Right" : y1 - y2 > 0 ? "Up" : "Down";
    }
  }, {
    key: "on",
    value: function on(evt, handler) {
      if (this[evt]) {
        this[evt].add(handler);
      }
    }
  }, {
    key: "off",
    value: function off(evt, handler) {
      if (this[evt]) {
        this[evt].del(handler);
      }
    }
  }, {
    key: "destroy",
    value: function destroy() {
      //清除所有的定时器操作
      if (this.singleTapTimeout) clearTimeout(this.singleTapTimeout);
      if (this.tapTimeout) clearTimeout(this.tapTimeout);
      if (this.longTapTimeout) clearTimeout(this.longTapTimeout);
      if (this.swipeTimeout) clearTimeout(this.swipeTimeout);

      //解绑所有的监听事件
      this.element.removeEventListener("touchstart", this.start);
      this.element.removeEventListener("touchmove", this.move);
      this.element.removeEventListener("touchend", this.end);
      this.element.removeEventListener("touchcancel", this.cancel);

      //取消所有的订阅
      this.rotate.del();
      this.singleRotate.del();
      this.touchStart.del();
      this.multipointStart.del();
      this.multipointEnd.del();
      this.pinch.del();
      ths.singlePinch.del();
      this.swipe.del();
      this.tap.del();
      this.doubleTap.del();
      this.longTap.del();
      this.singleTap.del();
      this.pressMove.del();
      this.twoFingerPressMove.del();
      this.touchMove.del();
      this.touchEnd.del();
      this.touchCancel.del();

      //自空所有的数据
      this.preV = this.pinchStartLen = this.zoom = this.isDoubleTap = this.delta = this.last = this.now = this.tapTimeout = this.singleTapTimeout = this.longTapTimeout = this.swipeTimeout = this.x1 = this.x2 = this.y1 = this.y2 = this.preTapPosition = this.rotate = this.singleRotate = this.touchStart = this.multipointStart = this.multipointEnd = this.pinch = this.singlePinch = this.swipe = this.tap = this.doubleTap = this.longTap = this.singleTap = this.pressMove = this.touchMove = this.touchEnd = this.touchCancel = this.twoFingerPressMove = null;

      window.removeEventListener("scroll", this._cancelAllHandler);
      return null;
    }
  }]);
  return ZingFinger;
}();

return ZingFinger;

})));
//# sourceMappingURL=zingfinger.js.map
