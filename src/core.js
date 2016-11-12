
function IScroll (el, options) {
	this.wrapper = typeof el == 'string' ? document.querySelector(el) : el;
	//wrapper表示的是DOM元素，获取的是包裹元素wrapper而不是内层的元素scroller，这一点一定要注意!!!!
	this.scroller = this.wrapper.children[0];
	//获取scroller元素。不要在wrapper元素下设置和scroller同级别的元素
	this.scrollerStyle = this.scroller.style;		// cache style for better performance
    //scrollerStyle表示获取的scroller元素的style属性
	this.options = {
       // INSERT POINT: OPTIONS
		disablePointer : !utils.hasPointer,
		//如果disablePointer为true，那么表示没有pointer事件，window.PointerEvent || window.MSPointerEvent
		disableTouch : utils.hasPointer || !utils.hasTouch,
		//如果disableTouch为true，那么条件是有pointer事件。或者没有pointer事件同时也没有touch事件
		disableMouse : utils.hasPointer || utils.hasTouch,
		//如果有pointer那么表示不会用Mouse事件，或者没有pointer但是有touch事件，那么也不会启用Mouse事件
		//也就是说只要pointer事件和touch事件任何一个存在那么就不会启用Mouse事件
		startX: 0,
		startY: 0,
		//这次scroller滚动的时候开始的坐标
		scrollY: true,
		//默认是垂直滚动的
		directionLockThreshold: 5,
		/*判断是水平还是垂直方向的临界值：
         //如果x移动的距离大于y方向移动的距离，那么表示我们锁定了是水平方向的滚动。
            //directionLockThreshold默认是5px
			if ( absDistX > absDistY + this.options.directionLockThreshold ) {
				this.directionLocked = 'h';		// lock horizontally
			} else if ( absDistY >= absDistX + this.options.directionLockThreshold ) {
				this.directionLocked = 'v';		// lock vertically
			} else {
				//否则双向都是可以滚动的
				this.directionLocked = 'n';		// no lock
			}
		*/
		momentum: true,
        //启动或者关闭惯性动画，当用户在屏幕上快速滑动的时候存在，关闭该选项可以极大的提升性能
		bounce: true,
		//是否反弹，会通过算法计算出当前拉伸后的距离，然后再次回来应该处于的位置
		bounceTime: 600,
		//弹跳动画
		bounceEasing: '',
        //弹跳动画期间的弹跳函数
		preventDefault: true,
		preventDefaultException: { tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/ },
        //除了preventDefaultException指定的以外，其他的标签都会触发preventDefault。可以通过className或者tagName指定
		HWCompositing: true,
		useTransition: true,
		useTransform: true,
		bindToWrapper: typeof window.onmousedown === "undefined"
		//move事件一般都是绑定在document上面的而不是wrapper元素上，这时候当你在wrapper外移动游标/手指，这个scroller元素
		//也会一直滚动。但是如果你可以把事件绑定在wrapper上，这时候只要指针离开了wrapper那么scroller就会停止!
	};

	for ( var i in options ) {
		this.options[i] = options[i];
	}
	// Normalize options
	this.translateZ = this.options.HWCompositing && utils.hasPerspective ? ' translateZ(0)' : '';
    //使用translateZ必须启动HWCompositing，同时含有perspective属性,判断是否有perspective，只要通过创建一个空的div，然后看其style中是否有这个属性就可以了
    //如果含有perspective属性，那么就可以为其添加'translateZ(0)'属性

	this.options.useTransition = utils.hasTransition && this.options.useTransition;
	//是否含有transition也是同样的道理，创建空div，看他的style是否有'transition'属性

	this.options.useTransform = utils.hasTransform && this.options.useTransform;
	//是否含有transform也是同样的道理，创建空div，看他的style是否有'transform'属性

	this.options.eventPassthrough = this.options.eventPassthrough === true ? 'vertical' : this.options.eventPassthrough;
	//如果设置为true，那么表示垂直方向上使用原生的滚动，而水平方向的滚动使用iscroll来完成。如果设置为'horizontal',那么忽略水平，而垂直方向上使用iScroll
    //如果eventPassthrough设置为false/undefined,那么this.options.eventPassthrough就是false/undefined

	this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault;
    //当事件触发的时候是否调用preventDefault方法，一般设置为true除非你明确的知道这个选项的用处。
    //如果设置了eventPassthrough，那么preventDefault就会false。因为这时候垂直方向或者水平方向不能取消默认事件

	// If you want eventPassthrough I have to lock one of the axes
	this.options.scrollY = this.options.eventPassthrough == 'vertical' ? false : this.options.scrollY;
	this.options.scrollX = this.options.eventPassthrough == 'horizontal' ? false : this.options.scrollX;
   //如果eventPassthrough为vertical，那么表示垂直方向使用原生的滚动，这时候scrollY设置为false就可以。也就是我们的iscroll不会处理scrollY
   //如果eventPassthrough为horizontal，那么表示水平方向使用原生的滚动，这时候scrollX设置为false就可以。也就是我们的iscroll不会处理scrollX

	// With eventPassthrough we also need lockDirection mechanism
	this.options.freeScroll = this.options.freeScroll && !this.options.eventPassthrough;
    //freeScroll用于指定垂直和水平都需要滚动的情况，如果水平垂直都要滚动可以设置为true。这时候你肯定不能设置eventPassthrough
    //也就是eventPassthrough必须是空的，因为eventPassthrough用于指定哪里忽略而使用原生的滚动。所以使用freeScroll必须忽略eventPassThrough

	this.options.directionLockThreshold = this.options.eventPassthrough ? 0 : this.options.directionLockThreshold;
    //如果指定了eventPassthrough那么directionLockThreshold就是0，因为eventPassthrough表示使用原生的滚动，这时候directionLockThreshold就是0
    
	this.options.bounceEasing = typeof this.options.bounceEasing == 'string' ? utils.ease[this.options.bounceEasing] || utils.ease.circular : this.options.bounceEasing;

	this.options.resizePolling = this.options.resizePolling === undefined ? 60 : this.options.resizePolling;
    //当resize窗口的时候，我们必须重新计算元素的位置和尺寸，这时候是非常消耗性能的。所以这里类似于函数节流的概念给浏览器休息的时间，减少这个数字
    //可以更加流畅但是对于CPU来说压力会更大

	if ( this.options.tap === true ) {
		this.options.tap = 'tap';
	}
	//当iscroll区域被点击或者tap，而没有被滚动，我们会触发一个自定义的tap事件。这个事件常用于处理与可点击的元素的交互。你也可以自定义一个事件名称

	// https://github.com/cubiq/iscroll/issues/1029
	if (!this.options.useTransition && !this.options.useTransform) {
		if(!(/relative|absolute/i).test(this.scrollerStyle.position)) {
			this.scrollerStyle.position = "relative";
		}
	}
   //为我们的scroller添加一个定位为relative
// INSERT POINT: NORMALIZATION

	// Some defaults
	this.x = 0;
	this.y = 0;
	//iScroll已经移动的距离
	this.directionX = 0;
	this.directionY = 0;
	//滚动的方向,向右和向下都是-1
	/*
	    this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
		this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;
	    //手指向上滑动，deltaY<0,所以this.directionY为1；手指向下滑动deltaY>0,所以this.directionY为-1
	    //手指向右滑动，deltaX>0，this.directionX为-1
	*/
	this._events = {};
    // INSERT POINT: DEFAULTS
	this._init();
	//调用原生prototype方法._init,用于注册一系列的事件
	this.refresh();
    //重新计算位置
	this.scrollTo(this.options.startX, this.options.startY);
	//iScroll默认从0，0开始滚动，但是startX,startY可以设置滚动开始的位置。内部会选择animation或者transition动画来完成
	this.enable();
	//设置iScroll对象的enable为true
}
IScroll.prototype = {
	version: '/* VERSION */',

	_init: function () {
		this._initEvents();
       // INSERT POINT: _init
      //如果指定了scrollbars或者indicators，那么我们要做相应的处理
      //含有scrollbars或者indicators都是会调用_initIndicators的!
       if ( this.options.scrollbars || this.options.indicators ) {
			this._initIndicators();
		}

        //指定了mouseWheel选项
		if ( this.options.mouseWheel ) {
			this._initWheel();
		}
         //snap可以把scroller自动设置为container的大小。可以接受一个字符串，这时候这个字符串就是一个
         //选择器
		if ( this.options.snap ) {
			this._initSnap();
		}
        //激活键盘和遥控器
		if ( this.options.keyBindings ) {
			this._initKeys();
		}
	},

	destroy: function () {
		this._initEvents(true);//移除所有的事件并清除定时器，同时触发destroy事件
		clearTimeout(this.resizeTimeout);
 		this.resizeTimeout = null;
		this._execEvent('destroy');
	},

	_transitionEnd: function (e) {
		//如果目标元素不是scroller或者滚动条就没有移动，那么直接返回
		if ( e.target != this.scroller || !this.isInTransition ) {
			return;
		}

		this._transitionTime();
		//设置transition-time属性
		if ( !this.resetPosition(this.options.bounceTime) ) {
			//如果不需要重新设定位置（没有滚动到边界位置），那么触发scrollEnd事件。如果已经滚动到边界位置，那么不做任何处理
			this.isInTransition = false;
			this._execEvent('scrollEnd');
		}
	},
   //0,1,2分别表示左中右按键
	_start: function (e) {
		// React to left mouse button only
		//这里只是针对mouse和pointer事件类型
		if ( utils.eventType[e.type] != 1 ) {
		  // for button property
		  // http://unixpapa.com/js/mouse.html
		  var button;
	    if (!e.which) {
	      /* IE case 
            如果没有e.which表示是IE浏览器，并把该浏览器做映射。如果e.button<2那么映射为左键，如果为4那么表示中间按键，否则表示右键。
            注意：IE8 及其更早版本不支持 which 属性。不支持的浏览器可使用 keyCode 属性。但是， keyCode 属性在 Firefox 浏览器的 onkeypress 事件中是无效的。 兼容这些浏览器你可以使用以下代码：
			  var x = event.which || event.keyCode;  // 使用 which 或 keyCode, 这样可支持不同浏览器
	      */
	      button = (e.button < 2) ? 0 :
	               ((e.button == 4) ? 1 : 2);
	    } else {
	      /* All others 
            其他浏览器通过e.button获取当前的按钮
	      */
	      button = e.button;
	    }
           //如果不是左键，那么直接返回了
			if ( button !== 0 ) {
				return;
			}
		}
        //必须调用iscroll的enable方法
		if ( !this.enabled || (this.initiated && utils.eventType[e.type] !== this.initiated) ) {
			return;
		}
         //当事件触发的时候，是否应该调用preventDefault()方法。
         //除了preventDefaultException指定的以外，其他的标签都会触发preventDefault。可以通过className或者tagName指定
         //preventDefaultException: { tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/ }
         //所以，这里表示除了INPUT|TEXTAREA|BUTTON|SELECT以外都会调用preventDefault方法
		if ( this.options.preventDefault && !utils.isBadAndroid && !utils.preventDefaultException(e.target, this.options.preventDefaultException) ) {
			e.preventDefault();
		}

		var point = e.touches ? e.touches[0] : e,
			pos;

		this.initiated	= utils.eventType[e.type];
		//this.initiated属性用于保存是touch/mouse/pointer事件类型
		//获取事件前面的数字，如下：
		/*
		{
				touchstart: 1,
				touchmove: 1,
				touchend: 1,

				mousedown: 2,
				mousemove: 2,
				mouseup: 2,

				pointerdown: 3,
				pointermove: 3,
				pointerup: 3,

				MSPointerDown: 3,
				MSPointerMove: 3,
				MSPointerUp: 3
			}
		获取的就是后面的数字
		*/
		this.moved		= false;
		//默认还没开始移动
		this.distX		= 0;
		this.distY		= 0;
		//触点变化的总距离,随着_move方法的调用而不断累加
		this.directionX = 0;
		this.directionY = 0;
		//表示滚动的方向
		this.directionLocked = 0;
		this.startTime = utils.getTime();
		//开始时间，this.isInTransition如果当前元素在移动的时候就是true，否则就是false
		if ( this.options.useTransition && this.isInTransition ) {
			this._transitionTime();
			//设置scroller的style的transition-duration属性，如果没有传入参数默认就是0ms
			this.isInTransition = false;
			//isInTransition为false
			pos = this.getComputedPosition();
			//通过window.getComputedStyle获取元素的位置。移动到x,y。开始时候是在(0,0)位置
			this._translate(Math.round(pos.x), Math.round(pos.y));
			//把我们的id="scroller"元素移动到pos.x/pos.y所在的位置即可
			this._execEvent('scrollEnd');
			//触发scrollEnd事件
		} else if ( !this.options.useTransition && this.isAnimating ) {
			this.isAnimating = false;
			this._execEvent('scrollEnd');
		}

		this.startX    = this.x;
		this.startY    = this.y;
		//iScroll已经滚动的距离的不及时反应
		this.absStartX = this.x;
		this.absStartY = this.y;
		//在_start事件中，我们保存原来的触点的X/Y坐标，也就是pageX/pageY属性。在_move的时候，this.pointX/this.pointY的值一直随着手指在移动
		this.pointX    = point.pageX;
		this.pointY    = point.pageY;
        //触发beforeScrollStart事件
		this._execEvent('beforeScrollStart');
	},


     //（1）e.pageX,e.pageY都是表示相对于文档来说的距离，越往右或者越往下，其值都会越大
     //（2）手指向上滑动，deltaY<0,所以this.directionY为1；手指向下滑动deltaY>0,所以this.directionY为-1
     //（3）this.x和this.y表示当前scroller元素所在的位置。因为scroller是向上滚动，所以其会不断隐藏到document上，所以其值在向下滚动的时候是负数,因为其已经隐藏了
	_move: function (e) {
		if ( !this.enabled || utils.eventType[e.type] !== this.initiated ) {
			return;
		}
        //检测是否有preventDefault
		if ( this.options.preventDefault ) {	// increases performance on Android? TODO: check!
			e.preventDefault();
		}

		var point		= e.touches ? e.touches[0] : e,
		    //move的时候获取主触点，检测和原来的触点X方向变化的距离deltaX和deltaY
			deltaX		= point.pageX - this.pointX,
			deltaY		= point.pageY - this.pointY,
			//当前时间
			timestamp	= utils.getTime(),
			newX, newY,
			absDistX, absDistY;

		this.pointX		= point.pageX;
		this.pointY		= point.pageY;
		//当前触点的位置pointX和pointY
		this.distX		+= deltaX;
		this.distY		+= deltaY;
		//更新由于触点移动导致的x和y轴方向移动的距离之和
		absDistX		= Math.abs(this.distX);
		absDistY		= Math.abs(this.distY);

		// We need to move at least 10 pixels for the scrolling to initiate
		//如果x和Y方向移动的距离都是小于10px，那么我们不会移动元素，也就是不会触发滚动事件。同时时间变化要大于300ms!!!!!
		if ( timestamp - this.endTime > 300 && (absDistX < 10 && absDistY < 10) ) {
			return;
		}

		// If you are scrolling in one direction lock the other
		//如果只是在一方向滚动，那么要锁住另外一方向的滚动
		if ( !this.directionLocked && !this.options.freeScroll ) {
			//如果x移动的距离大于y方向移动的距离，那么表示我们锁定了是水平方向的滚动。
            //directionLockThreshold默认是5px
			if (absDistX > absDistY + this.options.directionLockThreshold ) {
				this.directionLocked = 'h';		// lock horizontally
			} else if ( absDistY >= absDistX + this.options.directionLockThreshold ) {
				this.directionLocked = 'v';		// lock vertically
			} else {
				//否则双向都是可以滚动的
				this.directionLocked = 'n';		// no lock
			}
		}
         //如果应该是水平方向滚动
		if ( this.directionLocked == 'h' ) {
			//忽略了垂直方向，那么阻止默认事件
			if ( this.options.eventPassthrough == 'vertical' ) {
				e.preventDefault();
			} else if ( this.options.eventPassthrough == 'horizontal' ) {
				//水平方向滚动，同时忽略水平方向，那么initiated为false
				this.initiated = false;
				return;
			}
			//deltaY赋值为0
			deltaY = 0;
		 //如果是垂直方向滚动
		} else if ( this.directionLocked == 'v' ) {
			if ( this.options.eventPassthrough == 'horizontal' ) {
				e.preventDefault();
			} else if ( this.options.eventPassthrough == 'vertical' ) {
				this.initiated = false;
				//initiated设置为false
				return;
			}

			deltaX = 0;
		}

		deltaX = this.hasHorizontalScroll ? deltaX : 0;
		//如果有水平的滚动条，那么deltaX就是deltaX，否则就是0
		deltaY = this.hasVerticalScroll ? deltaY : 0;
         //水平和垂直变化的距离
		newX = this.x + deltaX;
		newY = this.y + deltaY;
        //新的x和y的坐标=当前的x,y坐标+变换的坐标。其中this.x获取到scroller元素滚动进去的距离，如果没有滚动进去那么就是0。而deltaX表示的手指滑动的距离！
        //this.x为负数表示隐藏，为0表示刚好显示，如果为正数表示刚好显示的时候用力往下拉

		// Slow down if outside of the boundaries
		if ( newX > 0 || newX < this.maxScrollX ) {
			newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
		}
		//注意1：newY>0表示用力往下拉（这时候scroller元素会在视口中往下移动），也就是说此时临界值表示的是刚好显示的情况。如果此时设置了bounce，那么此时减少Y轴变化的大小为1/3。如果没有bounce那么newY
		//设置为0，也就是表示不需要变化速度，直接恢复成为刚好显示的状态就可以了!
		//注意2：this.maxScrollY为负数，newY < this.maxScrollY表示已经滚动到最下面的时候你使劲的往上推，这时候也是临界条件，这一点要注意。两边同时乘以-1，也就是-this.maxScrollY>-newY
		//其中this.maxScrollY表示的是wrapper的高度-scroller的高度
		if ( newY > 0 || newY < this.maxScrollY ) {
			newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
		}
		this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
		this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;
		//手指向上滑动，deltaY<0,所以this.directionY为1；手指向下滑动deltaY>0,所以this.directionY为-1
		//手指向右滑动，deltaX>0，this.directionX为-1
		if ( !this.moved ) {
			//如果moved为false，那么触发scrollstart事件表示滚动开始
			this._execEvent('scrollStart');
		}
        //表示scroller已经开始移动了
		this.moved = true;
        //移动到新的newX,newY坐标
		this._translate(newX, newY);
/* REPLACE START: _move */
    //只要手指在屏幕上按住滑动的时候才会修改startX,startY,startTime，很显然这里要大于300ms才行
    //快速滑动是不会改变的
		if ( timestamp - this.startTime > 300 ) {
			this.startTime = timestamp;//更新startTime
			this.startX = this.x;//更新startX
			this.startY = this.y;//更新startY
		}

/* REPLACE END: _move */

	},
    //（1）pointerCancel等事件触发后就会调用这个方法。注意_move监听的是手指在屏幕上的移动，而_end监听的是手指抬起时候的事件
    //（2）this.startX,this.startY表示的是iScroll开始滚动的位置，默认是(0,0)。在_start/_move事件中我们把它赋值为了this.x/this.y了
    //但是必须是手指按住屏幕滑动才会更新这个参数值。不过前提是超过了300ms，否则不会更新this.startX,this.startY,this,startTime，因为没有必要！！！
	//（3）注意：当手指离开屏幕的时候会获取this.x/this.y，也就是iScroll当前的位置，然后也会获取到上一次开始的位置this.startY，相减就会得到变化的距离，同时也会得到当前的时间和开始_start的时间，相减就是总共的时间，继而可以计算到速度
	//所以，调用utils.momentum时候传入的this.x和scroller上面的translateY的值不一样，因为前者是手指离开时候的x，而后者是经过惯性变化后最终的位置
	_end: function (e) {
		if ( !this.enabled || utils.eventType[e.type] !== this.initiated ) {
			return;
		}
         //除了这些元素，即this.options.preventDefaultException都会触发preventDefault事件
		if ( this.options.preventDefault && !utils.preventDefaultException(e.target, this.options.preventDefaultException) ) {
			e.preventDefault();
		}
        
		var point = e.changedTouches ? e.changedTouches[0] : e,
		//获取触点的最终位置
			momentumX,
			momentumY,
			duration = utils.getTime() - this.startTime,
			//获取结束到开始的时间
			newX = Math.round(this.x),
			newY = Math.round(this.y),
			//获取scroller元素当前所在的位置
			distanceX = Math.abs(newX - this.startX),
			distanceY = Math.abs(newY - this.startY),
			//当前的位置和开始滚动的位置的差值
			time = 0,
			easing = '';

		this.isInTransition = 0;
		this.initiated = 0;
		//重新设置initiated，isInTransition为0
		this.endTime = utils.getTime();
		// reset if we are outside of the boundaries
		//如果在边界之外我们重新设置
		if ( this.resetPosition(this.options.bounceTime) ) {
			return;
		}

		this.scrollTo(newX, newY);	
		// ensures that the last position is rounded
		//保证位置信息是整数

		// we scrolled less than 10 pixels
		//只是在_move方法中会把this.moved设置为true,其他情况下都是false
		/*
          	me.tap = function (e, eventName) {
			var ev = document.createEvent('Event');
			ev.initEvent(eventName, true, true);
			ev.pageX = e.pageX;
			ev.pageY = e.pageY;
			e.target.dispatchEvent(ev);
		};
		如果option.tap是true，那么事件名称就是'tap'，否则就是自己设置的事件名称。前提是iScroll没有滚动
		*/
		if ( !this.moved ) {
			if ( this.options.tap ) {
				utils.tap(e, this.options.tap);
			}
           //为了覆盖原生的滚动事件，iScroll必须阻止很多的浏览器默认行为，例如鼠标点击。如果你想要在在iScroll
           //没有滚动的时候可以触发click事件，那么你可以吧click设置为true
			if ( this.options.click ) {
				/*
                 me.click = function (e) {
					var target = e.target,
						ev;
					if ( !(/(SELECT|INPUT|TEXTAREA)/i).test(target.tagName) ) {
						// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/initMouseEvent
						// initMouseEvent is deprecated.
						ev = document.createEvent(window.MouseEvent ? 'MouseEvents' : 'Event');
						ev.initEvent('click', true, true);
						ev.view = e.view || window;
						ev.detail = 1;
						ev.screenX = target.screenX || 0;
						ev.screenY = target.screenY || 0;
						ev.clientX = target.clientX || 0;
						ev.clientY = target.clientY || 0;
						ev.ctrlKey = !!e.ctrlKey;
						ev.altKey = !!e.altKey;
						ev.shiftKey = !!e.shiftKey;
						ev.metaKey = !!e.metaKey;
						ev.button = 0;
						ev.relatedTarget = null;
						ev._constructed = true;
						target.dispatchEvent(ev);
					}
				};
				*/
				utils.click(e);
			}
        //触发scrollCancel,因为压根就没有移动
			this._execEvent('scrollCancel');
			return;
		}
        //触发flick事件：前提是（1）变化的持续时间小于200ms；（2）变换的x/y都是小于100的，如果distanceX/distanceY
        //大于100，那么就是move，而不是flick事件了
		if ( this._events.flick && duration < 200 && distanceX < 100 && distanceY < 100 ) {
			this._execEvent('flick');
			return;
		}

		// start momentum animation if needed
		//开始惯性动画，其中startTime表示手指离开的一刹那时间。scrollCancel/flick上面已经直接return了

		if ( this.options.momentum && duration < 300 ) {
			//如果有bounce选项，那么传入的是this.wrapperWidth和this.wrapperHeight，否则就是0
			momentumX = this.hasHorizontalScroll ? utils.momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ? this.wrapperWidth : 0, this.options.deceleration) : { destination: newX, duration: 0 };
			momentumY = this.hasVerticalScroll ? utils.momentum(this.y, this.startY, duration, this.maxScrollY, this.options.bounce ? this.wrapperHeight : 0, this.options.deceleration) : { destination: newY, duration: 0 };
			/*
			//获取惯性事件(可以参见util.js中自己的注释)
				me.momentum = function (current, start, time, lowerMargin, wrapperSize, deceleration) {
					//utils.momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ? this.wrapperWidth : 0, this.options.deceleration) 
					var distance = current - start,
						speed = Math.abs(distance) / time,
						//获取从开始移动到手指离开的时候手指移动的平均速度
						destination,
						duration;
			         //deceleration默认为0.0006,减速。这个值越大，那么速度变化越快，但是如果其值大于0.01，那么惯性动画不明显
					deceleration = deceleration === undefined ? 0.0006 : deceleration;
					destination = current + ( speed * speed ) / ( 2 * deceleration ) * ( distance < 0 ? -1 : 1 );
					//惯性动画的最终位置是通过该公式计算得到的。distance<0表示向上移动元素，所以加上一个负数，所以越往下移动（因为负数表示scroller往上隐藏的更多）。
					duration = speed / deceleration;
					//计算得到手指滑动的平均速度/加速度=减速需要的时长
					//lowerMargin表示this.maxScrollY
					//wrapperSize=this.options.bounce ? this.wrapperHeight : 0
					if ( destination < lowerMargin ) {
						//那么表示向上滚动到极限后还要滚动
						destination = wrapperSize ? lowerMargin - ( wrapperSize / 2.5 * ( speed / 8 ) ) : lowerMargin;
						//如果没有传递bounce，那么表示不会反弹，这时候目标位置就是极限位置。如果传递了bounce表示可以反弹，那么目标位置就是这个目标位置就会比极限位置更小
						//小的距离是通过：( wrapperSize / 2.5 * ( speed / 8 ) )计算得到的。
						distance = Math.abs(destination - current);
						duration = distance / speed;
					//如果距离大于0，表示已经到达临界条件后你还在往下拉元素，这时候也会修改目标元素的位置
					} else if ( destination > 0 ) {
						destination = wrapperSize ? wrapperSize / 2.5 * ( speed / 8 ) : 0;
						distance = Math.abs(current) + destination;
						duration = distance / speed;
					}

					return {
						destination: Math.round(destination),
						duration: duration
					};
				};
			*/
			newX = momentumX.destination;
			newY = momentumY.destination;
			time = Math.max(momentumX.duration, momentumY.duration);
			//返回的有destination和duration选项
			this.isInTransition = 1;
		}

// INSERT POINT: _end
        //其中newX表示Math.round(this.x);
		if ( newX != this.x || newY != this.y ) {
			//表示还需要滚动一段位置，这时候继续滚动就可以了
			// change easing function when scroller goes out of the boundaries
			if ( newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY ) {
				easing = utils.ease.quadratic;
				//动画变化函数
			}
           //惯性动画移动到newX,newY位置
			this.scrollTo(newX, newY, time, easing);
			return;
		}
        //触发scrollEnd事件,scrollEnd中会触发_end方法，其会让元素回到原来的位置，通过resetPosition来完成
		this._execEvent('scrollEnd');
	},



 //resizePolling表示延迟多少毫秒触发fresh事件，通过减少这个值可以得到更好的视觉效果，但是对于CPU来说消耗很大，默认值60ms一般已经足够了
	_resize: function () {
		var that = this;
		clearTimeout(this.resizeTimeout);
		//触发refresh
		this.resizeTimeout = setTimeout(function () {
			that.refresh();
		}, this.options.resizePolling);
	},

   //重新设置位置，以time作为参数
   //that.resetPosition(that.options.bounceTime)
	resetPosition: function (time) {
		//this.x、this.y表示iScroll对象当前所在的位置，也就是scroller元素移动的距离，向上隐藏为负数
		var x = this.x,
			y = this.y;

		time = time || 0;
        //如果没有水平滚动条那么显然显示在x=0的位置就可以了；如果有水平滚动条，同时滚动的距离>0（如使劲的往右拉），这时候回到(0,0)处
		if ( !this.hasHorizontalScroll || this.x > 0 ) {
			x = 0;
		 //如果this.x<this.maxScrollX那么水平方法已经到临界值，但是你还不断的往左边拉，这时候恢复到this.maxScrollX;也就是显示元素最右边位置就可以了!
		} else if ( this.x < this.maxScrollX ) {
			x = this.maxScrollX;
		}
        
        //没有垂直滚动条显示到垂直方向为0处，有垂直滚动条同时this.y>0表示你使劲的往下拉，这时候设置为原点。
		if ( !this.hasVerticalScroll || this.y > 0 ) {
			y = 0;
		} else if ( this.y < this.maxScrollY ) {
			//设置显示垂直方向最下面部分
			y = this.maxScrollY;
		}
         //如果上面所有的if都没有执行，表示不需要重新设置位置的时候就会返回false，否则只有有重新设置就会滚动到特定的位置返回true
		if ( x == this.x && y == this.y ) {
			return false;
		}
        //滚动到x,y的坐标，时间为time,函数为this.options.bounceEasing。调用对象为该iScroll对象
		this.scrollTo(x, y, time, this.options.bounceEasing);
		return true;
	},
   //设置启用和禁用iScroll
	disable: function () {
		this.enabled = false;
	},

	enable: function () {
		this.enabled = true;
	},
	//刷新：refresh做的事情就是获取水平垂直可以滚动的距离，然后触发refresh事件
	refresh: function () {
		utils.getRect(this.wrapper);
		//首先获取到包裹元素矩形对象的clientWidth/clientHeight，clientWidth=width+2*borderWidth
		this.wrapperWidth	= this.wrapper.clientWidth;
		this.wrapperHeight	= this.wrapper.clientHeight;
		//获取scroller元素的矩形对象，也就是他的width/height属性
		var rect = utils.getRect(this.scroller);
		this.scrollerWidth	= rect.width;
		this.scrollerHeight	= rect.height;
        //maxScrollX,maxScrollY表示的最大的滚动距离，其值为父元素的clientWidth-子元素的width
        //wrapper可以设置width，但是scroll是不可以设置宽度的，所以maxScrollX如果为负数，那么表示scroll特别宽，这时候表示可以往左边移动，也就是是负数
        //wrapper可以设置height，但是scroll是不可以设置高度的，所以maxScrollY如果为负数，表示元素可以往上面移动
		this.maxScrollX		= this.wrapperWidth - this.scrollerWidth;
		this.maxScrollY		= this.wrapperHeight - this.scrollerHeight;
		this.hasHorizontalScroll	= this.options.scrollX && this.maxScrollX < 0;
		this.hasVerticalScroll		= this.options.scrollY && this.maxScrollY < 0;
		//如果指定了scrollX，同时maxScrollX<0。那么这时候表示有水平的滚动条，如果>=0肯定是没有水平滚动条的
	    //如果指定了scrollY，同时maxScrollY<0。那么这时候表示有垂直的滚动条，如果>=0肯定是没有垂直滚动条的
		if ( !this.hasHorizontalScroll ) {
			this.maxScrollX = 0;
			this.scrollerWidth = this.wrapperWidth;
		}
         //如果没有垂直滚动条，那么maxScrollY就是0，同时scroll的高度和wrap的高度是一样的
		if ( !this.hasVerticalScroll ) {
			this.maxScrollY = 0;
			this.scrollerHeight = this.wrapperHeight;
		}
		this.endTime = 0;
		this.directionX = 0;
		this.directionY = 0;
       
		this.wrapperOffset = utils.offset(this.wrapper);
		//获取wrapper元素的offset值,一直往上计算，一直到该元素没有offsetParent为止，同时要记住：这是逐级往上计算的，而且这是负数，通过这种方式可以简单的获取到距离document的距离!
		this._execEvent('refresh');
        //触发refresh事件
		this.resetPosition();
	},
    //iScroll可以触发很多有用的自定义事件，API就是这个on方法。可以注册很多beforeScrollStart,scrollCancel,scrollStart,scrll,scrollEnd,flick,zoomStart,zoomEnd事件等
	on: function (type, fn) {
		if ( !this._events[type] ) {
			this._events[type] = [];
		}
		this._events[type].push(fn);
	},
     //移除事件
	off: function (type, fn) {
		if ( !this._events[type] ) {
			return;
		}
		var index = this._events[type].indexOf(fn);
		if ( index > -1 ) {
			this._events[type].splice(index, 1);
		}
	},

     //触发refresh事件
	_execEvent: function (type) {
		if ( !this._events[type] ) {
			return;
		}

		var i = 0,
			l = this._events[type].length;

		if ( !l ) {
			return;
		}
		for ( ; i < l; i++ ) {
			//其中this为iscroller元素，其他的参数作为额外参数传入
			this._events[type][i].apply(this, [].slice.call(arguments, 1));
		}
	},
   //scrollBy表示滚动的多少距离（在当前位置的基础上）
	scrollBy: function (x, y, time, easing) {
		x = this.x + x;
		y = this.y + y;
		time = time || 0;

		this.scrollTo(x, y, time, easing);
	},

   //调用方式：this.scrollTo(x, y, time, this.options.bounceEasing);
	scrollTo: function (x, y, time, easing) {
		easing = easing || utils.ease.circular;
		//获取circular对象，该对象有style和fn属性
		this.isInTransition = this.options.useTransition && time > 0;
		//是否使用transtion动画，同时time>0
		var transitionType = this.options.useTransition && easing.style;
		//这里的transitionType就是我们的动画的贝塞尔曲线
		if ( !time || transitionType ) {
				if(transitionType) {
					//如果存在贝塞尔曲线
					this._transitionTimingFunction(easing.style);
					//为scroller元素添加transtion-timing-function函数
					this._transitionTime(time);
					//这是transition-duration属性
				}
				//我们直接移动到x,y的坐标
			this._translate(x, y);
		} else {
			//如果没有transitionType，这时候我们使用animate就可以了
			this._animate(x, y, time, easing.fn);
			//这时候我们使用animation动画而不是使用transition动画来完成，其中easing.fn和我们的easing.style是同一个贝塞尔函数的不同表达
		}
	},

	scrollToElement: function (el, time, offsetX, offsetY, easing) {
		el = el.nodeType ? el : this.scroller.querySelector(el);
        //如果参数是Element，那么获取该Element，否则在scroller元素下通过选择器获取该元素
		if ( !el ) {
			return;
		}
        //获取该元素的offset值，返回的包括left/top。计算如下：
        /*‘
		utils.offset = function (el) {
				var left = -el.offsetLeft,
					top = -el.offsetTop;
				// jshint -W084
				while (el = el.offsetParent) {
					left -= el.offsetLeft;
					top -= el.offsetTop;
				}
				// jshint +W084
				return {
					left: left,
					top: top
				};
			};
        */
		var pos = utils.offset(el);
		//之所以计算offset值，是因为scroller元素已经经过定位了，而offset就是计算到定位父元素的距离
		pos.left -= this.wrapperOffset.left;
		pos.top  -= this.wrapperOffset.top;
		//其中this.wrapperOffset = utils.offset(this.wrapper);
		//获取该元素相对于wrapper元素移动的距离是多少
		// if offsetX/Y are true we center the element to the screen
		var elRect = utils.getRect(el);
		/*
       utils.getRect = function(el) {
		if (el instanceof SVGElement) {
		//SVG采用的是getBoundingClientRect，而其他元素采用的是offsetWidth等
			var rect = el.getBoundingClientRect();
			return {
				top : rect.top,
				left : rect.left,
				width : rect.width,
				height : rect.height
			};
		} else {
			return {
				top : el.offsetTop,
				left : el.offsetLeft,
				width : el.offsetWidth,
				height : el.offsetHeight
			};
		}
		*/
		var wrapperRect = utils.getRect(this.wrapper);
		//获取wrapper元素相对于视口或者定位的父元素的距离
		if ( offsetX === true ) {
			//注意：这里将会是负数，表示element元素要在X轴移动的距离
			offsetX = Math.round(elRect.width / 2 - wrapperRect.width / 2);
		}
		//注意：这里将会是负数，表示element元素要在Y轴移动的距离
		if ( offsetY === true ) {
			offsetY = Math.round(elRect.height / 2 - wrapperRect.height / 2);
		}
        //更新元素的left/top的值，这是通过offsetParent来计算出来的
		pos.left -= offsetX || 0;
		pos.top  -= offsetY || 0;
        
		pos.left = pos.left > 0 ? 0 : pos.left < this.maxScrollX ? this.maxScrollX : pos.left;
		pos.top  = pos.top  > 0 ? 0 : pos.top  < this.maxScrollY ? this.maxScrollY : pos.top;
        //如果元素的left大于0，也就是其相对于wrapper的offsetLeft为0表示元素已经显示出来了，left设置为0就可以了
        //如果left>this.maxScrollX也就是-left<-this.maxScrollX，这时候表示向左还没有滚动到极限，这时候设置为left就可以了
		time = time === undefined || time === null || time === 'auto' ? 
		Math.max(Math.abs(this.x-pos.left), Math.abs(this.y-pos.top)) : time;
        //如果没有设置时间，那么自动计算时间
		this.scrollTo(pos.left, pos.top, time, easing);
	},


    //调用方式为：this._transitionTime(time);
	_transitionTime: function (time) {
		if (!this.options.useTransition) {
			return;
		}
		time = time || 0;
		var durationProp = utils.style.transitionDuration;
		//获取含有特定前缀得到transition-duration属性，如mozTransitionDuration或者oTransitionDuration属性
		if(!durationProp) {
			return;
		}
		this.scrollerStyle[durationProp] = time + 'ms';
		//设置动画持续的时长

		if ( !time && utils.isBadAndroid ) {
			//如果没有指定time，同时针对的是特殊的浏览器，那么我们直接添加0.0001ms，同时使用RAF在下一帧直接移除我们的duration属性
			this.scrollerStyle[durationProp] = '0.0001ms';
			// remove 0.0001ms
			var self = this;
			rAF(function() {
				if(self.scrollerStyle[durationProp] === '0.0001ms') {
					self.scrollerStyle[durationProp] = '0s';
				}
			});
		}

// INSERT POINT: _transitionTime

	},

   //调用方式为：	this._transitionTimingFunction(easing.style);
   //this.scrollerStyle就是我们的scroll元素的cssStyle对象,我们的utils.style.transitionTimingFunction获取的就是为我们的transition-timing-function设置前缀，这一点一定要弄清楚!!
   //这也是utils.style的主要作用
	_transitionTimingFunction: function (easing) {
		this.scrollerStyle[utils.style.transitionTimingFunction] = easing;

// INSERT POINT: _transitionTimingFunction

	},

//调用方式为：that._translate(destX, destY);
	_translate: function (x, y) {
		//如果使用transform动画那么我们添加transform就行
		if ( this.options.useTransform ) {
/* REPLACE START: _translate */
			this.scrollerStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.translateZ;
/* REPLACE END: _translate */
		} else {
			x = Math.round(x);
			y = Math.round(y);
			//获取结束位置，然后使用left/top来移动元素，同时this.x/this.y保存的就是我们的结束位置!!!!!!
			this.scrollerStyle.left = x + 'px';
			this.scrollerStyle.top = y + 'px';
		}
		this.x = x;
		this.y = y;
	//iScroll发生移动的时候会更新indicator的位置
	if ( this.indicators ) {
		for ( var i = this.indicators.length; i--; ) {
			this.indicators[i].updatePosition();
		}
	}
     // INSERT POINT: _translate
	},

  
   //注意：这里很多方法是绑定在wrapper上，而又一部分都是绑定在target上面的
  
	_initEvents: function (remove) {
		//如果传入参数为true那么表示移除事件
		var eventType = remove ? utils.removeEvent : utils.addEvent,
			target = this.options.bindToWrapper ? this.wrapper : window;
        //如果bindToWrapper为true，那么target对象就是wrapper对象，而不是window
		eventType(window, 'orientationchange', this);
		eventType(window, 'resize', this);
        //iscroll把所有浏览器的默认行为例如click都阻止了，如果你想要开启可以使用click
		if ( this.options.click ) {
			eventType(this.wrapper, 'click', this, true);
		}
         //disableMouse= utils.hasPointer || utils.hasTouch
         //也就是说没有pointer事件和touch事件的时候我们就会绑定mouse事件，如mousedown等
		if ( !this.options.disableMouse ) {
			eventType(this.wrapper, 'mousedown', this);
			eventType(target, 'mousemove', this);
			eventType(target, 'mousecancel', this);
			eventType(target, 'mouseup', this);
		}
        //disablePointer : !utils.hasPointer
        //如果有pointer事件，同时pointer事件没有被阻止，那么我们添加pointer事件
		if ( utils.hasPointer && !this.options.disablePointer ) {
			eventType(this.wrapper, utils.prefixPointerEvent('pointerdown'), this);
			eventType(target, utils.prefixPointerEvent('pointermove'), this);
			eventType(target, utils.prefixPointerEvent('pointercancel'), this);
			eventType(target, utils.prefixPointerEvent('pointerup'), this);
		}
        //如果有touch同时touch没有被阻止那么添加touch事件
        //hasTouch: 'ontouchstart' in window
		if ( utils.hasTouch && !this.options.disableTouch ) {
			eventType(this.wrapper, 'touchstart', this);
			eventType(target, 'touchmove', this);
			eventType(target, 'touchcancel', this);
			eventType(target, 'touchend', this);
		}
        //为scroller添加transitionend事件监听滚动是否结束
		eventType(this.scroller, 'transitionend', this);
		eventType(this.scroller, 'webkitTransitionEnd', this);
		eventType(this.scroller, 'oTransitionEnd', this);
		eventType(this.scroller, 'MSTransitionEnd', this);
	},

	getComputedPosition: function () {
		//获取iScroller对象的中的scroller属性
		var matrix = window.getComputedStyle(this.scroller, null),
			x, y;
		if ( this.options.useTransform ) {
			matrix = matrix[utils.style.transform].split(')')[0].split(', ');
			//transform属性为：transform: matrix(1, 0, 0, 1, 0, -146)
			//其中[0,-146]分别表示x,y
			x = +(matrix[12] || matrix[4]);
			y = +(matrix[13] || matrix[5]);
		} else {
			x = +matrix.left.replace(/[^-\d.]/g, '');
			y = +matrix.top.replace(/[^-\d.]/g, '');
		}

		return { x: x, y: y };
	},




	//(1)创建滚动条本身（不是滚动槽）和我们自定义的indicator元素!
	_initIndicators: function () {
		var interactive = this.options.interactiveScrollbars,
		   //interactiveScrollbars表示滚动条可以拖动，同时用户可以和滚动条进行交互
			customStyle = typeof this.options.scrollbars != 'string',
			//如果scrollbars不是字符串，那么表示是自定义的scrollbars
			indicators = [],
			indicator;

		var that = this;
		this.indicators = [];
         //如果指定了可以有滚动条，那么才会执行下面的逻辑
		if ( this.options.scrollbars ) {
		// Vertical scrollbar
			if ( this.options.scrollY ) {
				indicator = {
					el: createDefaultScrollbar('v', interactive, this.options.scrollbars),
					interactive: interactive,//表示用户是否可以拖动滚动条
					defaultScrollbars: true,//defaultScrollbars默认为true
					customStyle: customStyle,//如果不是字符串，那么表示自定义的类型。
					resize: this.options.resizeScrollbars,//滚动条的大小基于wapper和scroller的width/height的比例，如果把这个属性设置为false那么可以设置固定的大小滚动条。这在设置自定义的滚动条的时候特别有用
					shrink: this.options.shrinkScrollbars,//是否缩小scrollbars，有效的值为'clip','scale',false
					fade: this.options.fadeScrollbars,//当没有使用滚动的时候，我们的滚动条会消失。让这个选项保持为false可以节省资源
					listenX: false
				};

				this.wrapper.appendChild(indicator.el);
				//所以成了下面的DOM结构
				indicators.push(indicator);
				//同时把这个indicator放入我们的数组
			}

			// Horizontal scrollbar
			//水平滚动条
			if ( this.options.scrollX ) {
				indicator = {
					el: createDefaultScrollbar('h', interactive, this.options.scrollbars),
					interactive: interactive,
					defaultScrollbars: true,
					customStyle: customStyle,
					resize: this.options.resizeScrollbars,
					shrink: this.options.shrinkScrollbars,
					fade: this.options.fadeScrollbars,
					listenY: false
				};
                //在wrapper下面，也就是和scroll同级别的部位添加我们的indicators元素
				this.wrapper.appendChild(indicator.el);
				//把所有的indicator放入我们的indicators数组
				indicators.push(indicator);
			}
		}
        //用户指定了indicators，那么连接起来,得到的是数组，每一个数组元素都是一个indicator元素，其是一个Object对象，这一点一定要弄清楚
		if ( this.options.indicators ) {
			// TODO: check concat compatibility
			indicators = indicators.concat(this.options.indicators);
		}
        //这是iScroll实例对象的具有的indiators属性
		for ( var i = indicators.length; i--; ) {
			this.indicators.push( new Indicator(this, indicators[i]) );
		}
		// TODO: check if we can use array.map (wide compatibility and performance issues)
		function _indicatorsMap (fn) {
			if (that.indicators) {
				for ( var i = that.indicators.length; i--; ) {
					fn.call(that.indicators[i]);
				}
			}
		}

         /*
			fade: function (val, hold) {
					//如果hold为true同时当前元素是不可见的，那么不会调用fade放啊
					if ( hold && !this.visible ) {
						return;
					}

					clearTimeout(this.fadeTimeout);
					this.fadeTimeout = null;
					var time = val ? 250 : 500,
						delay = val ? 0 : 300;
						//如果没有传递val

					val = val ? '1' : '0';
					this.wrapperStyle[utils.style.transitionDuration] = time + 'ms';
					//下面是一个立即执行函数
					this.fadeTimeout = setTimeout((function (val) {
						this.wrapperStyle.opacity = val;
						this.visible = +val;
					}).bind(this, val), delay);
				}
         */

		if ( this.options.fadeScrollbars ) {

			this.on('scrollEnd', function () {
				_indicatorsMap(function () {
					this.fade();
					//默认time是500（也就是anmation-durantion），delay为300，val(也就是opacity)为"0"(表示完全透明)。
					//就是使用val参数来指定animation-duration和animation-delay属性的值，其中iScroll元素的visible属性也是通过val来指定的
					//如果第一个参数没有指定那么就是0，否则就是1
				});
			});

			this.on('scrollCancel', function () {
				_indicatorsMap(function () {
					this.fade();
					//调用Indicator的prototype上的fade方法。
				});
			});

			this.on('scrollStart', function () {
				_indicatorsMap(function () {
					this.fade(1);
					//scrollstart表示开始滚动，这时候opacity就是1，也就是要让它显示出来
				});
			});

			this.on('beforeScrollStart', function () {
				_indicatorsMap(function () {
					this.fade(1, true);
					//beforeScrollStart还没有开始滚动
				});
			});
		}

        //绑定refresh事件
		this.on('refresh', function () {

			_indicatorsMap(function () {
				this.refresh();
			});
		});
       //绑定destroy事件
		this.on('destroy', function () {
			_indicatorsMap(function () {
				this.destroy();
			});

			delete this.indicators;
		});
	},
    //绑定鼠标事件，都是绑定在wrapper元素上面的,也就是说wheel/mousewheel/DOMMouseScroll等，所以当你在其他地方滚动鼠标滚轮的时候不会导致iscroll发生滚动
    //（1）IE6首先实现的mousewheel事件，后续浏览器都支持了，最终冒泡到document(IE8)和window(IE9,Opera,Chrome,Safari)
    //（2）FF支持的是DOMMouseScroll事件，也是和鼠标滚轮滚动的时候出发
    // (3)wheel事件是所有的浏览器都支持的，http://www.cnblogs.com/rubylouvre/archive/2010/05/01/1725462.html
    // (4)不会同时存在一个浏览器支持了mousewheel的时候又支持wheel事件的，不然不会这样绑定事件
	_initWheel: function () {
		utils.addEvent(this.wrapper, 'wheel', this);
		utils.addEvent(this.wrapper, 'mousewheel', this);
		utils.addEvent(this.wrapper, 'DOMMouseScroll', this);
       
		this.on('destroy', function () {
			clearTimeout(this.wheelTimeout);
			this.wheelTimeout = null;
			utils.removeEvent(this.wrapper, 'wheel', this);
			utils.removeEvent(this.wrapper, 'mousewheel', this);
			utils.removeEvent(this.wrapper, 'DOMMouseScroll', this);
		});
	},



	/*
     (1)e.wheelDeltaY / 120获取滚轮滚动的距离，通过this.options.mouseWheelSpeed配置滚轮滚动1单位，那么iScroll移动的距离，最后得到的就是iScroll的距离。这样也可以通过
        this.options.mouseWheelSpeed来控制iScroll滚动的距离

	*/

	_wheel: function (e) {
		//iScroll没有启用，直接返回
		if ( !this.enabled ) {
			return;
		}
       //阻止默认事件，也就是去除鼠标默认的滚轮事件处理
		e.preventDefault();
		var wheelDeltaX, wheelDeltaY,
			newX, newY,
			that = this;
        //触发scrollStart，wheelTimeout是滚动的一个定时器，如果已经存在定时器，这里的scrollStart不会执行
        //所以保证只会执行一次
		if ( this.wheelTimeout === undefined ) {
			that._execEvent('scrollStart');
		}

		// Execute the scrollEnd event after 400ms the wheel stopped scrolling
		clearTimeout(this.wheelTimeout);
		//清除定时器
		this.wheelTimeout = setTimeout(function () {
			//400ms后触发"scrollEnd"事件，如果没有分页的情况下就是自己滚动的，而不是通过分页滚动的
			if(!that.options.snap) {
				that._execEvent('scrollEnd');
			}
			that.wheelTimeout = undefined;
		}, 400);
        
        //deltaX表示鼠标绕着水平方向滚动的【距离】,如果通过wheelDelta来计算的话，那么就要除以120或者3的倍数
        //https://msdn.microsoft.com/nb-no/library/hh465821.aspx
		if ( 'deltaX' in e ) {
			//deltaMode如果是0表示像素衡量，如果deltaMode为1表示文本行数，如果为2表示文本的页数
			//https://msdn.microsoft.com/nb-no/library/hh441120.aspx
			if (e.deltaMode === 1) {
				//mouseWheelSpeed表示鼠标滚轮的速度（也就是鼠标滚动一单位，那么移动的像素值），所以要乘以mouseWheelSpeed，其值默认是20
				//https://developer.mozilla.org/zh-CN/docs/Web/Events/wheel
				wheelDeltaX = -e.deltaX * this.options.mouseWheelSpeed;
				wheelDeltaY = -e.deltaY * this.options.mouseWheelSpeed;
			} else {
				//如果是表示像素或者页码，那么鼠标滚动的就是像素，而不用手动计算像素
				wheelDeltaX = -e.deltaX;
				wheelDeltaY = -e.deltaY;
			}
			//如果含有wheelDeltaX，那么表示X和Y方向是单独计算的，这时候wheelDeltaX和wheelDeltaY不一致了，要单独计算
		} else if ( 'wheelDeltaX' in e ) {
			wheelDeltaX = e.wheelDeltaX / 120 * this.options.mouseWheelSpeed;
			wheelDeltaY = e.wheelDeltaY / 120 * this.options.mouseWheelSpeed;
		} else if ( 'wheelDelta' in e ) {
			//如果只是含有wheelDelta，那么wheelDeltaX和wheelDeltaY的值一样
			wheelDeltaX = wheelDeltaY = e.wheelDelta / 120 * this.options.mouseWheelSpeed;
		} else if ( 'detail' in e ) {
            //向前滚动，那么该值是-3的倍数，向后滚动的时候是3的倍数。同时wheelDeltaX和wheelDeltaY一样
			wheelDeltaX = wheelDeltaY = -e.detail / 3 * this.options.mouseWheelSpeed;
		} else {
			return;
		}
        //反向鼠标滚轮，invertWheelDirection表示iScroll滚动的方向和鼠标滚动的方向是否要相反
		wheelDeltaX *= this.options.invertWheelDirection;
		wheelDeltaY *= this.options.invertWheelDirection;
         //没有垂直滚动条，那么只有水平的，此时wheelDeltaX设置为wheelDeltaY。表示这时候鼠标在X轴方向移动的距离和鼠标在Y方向移动的距离一样!
		if ( !this.hasVerticalScroll ) {
			wheelDeltaX = wheelDeltaY;
			wheelDeltaY = 0;
		}

		if ( this.options.snap ) {
			//如果已经分页了
			newX = this.currentPage.pageX;
			newY = this.currentPage.pageY;
            //获取当前页面的pageX/pageY属性，鼠标向前滚动的时候是120的倍数，向后滚动是-120的倍数
            //上面已经统一了滚动的方向，所以deltaX/deltaY计算出来的都是表示iScroll应该往哪个方向移动的距离
			if ( wheelDeltaX > 0 ) {
				newX--;
			} else if ( wheelDeltaX < 0 ) {
				newX++;
			}

			if ( wheelDeltaY > 0 ) {
				newY--;
			} else if ( wheelDeltaY < 0 ) {
				newY++;
			}
            //移动到指定的页
			this.goToPage(newX, newY);
			return;
		}
        //如果没有分页，那么计算出iScroll应该所在的位置，然后调用scrollTo而不是goToPage完成滚动
		newX = this.x + Math.round(this.hasHorizontalScroll ? wheelDeltaX : 0);
		newY = this.y + Math.round(this.hasVerticalScroll ? wheelDeltaY : 0);
        //更新directionX、directionY
		this.directionX = wheelDeltaX > 0 ? -1 : wheelDeltaX < 0 ? 1 : 0;
		this.directionY = wheelDeltaY > 0 ? -1 : wheelDeltaY < 0 ? 1 : 0;
        //更新临界值
		if ( newX > 0 ) {
			newX = 0;
		} else if ( newX < this.maxScrollX ) {
			newX = this.maxScrollX;
		}
        //更新临界值
		if ( newY > 0 ) {
			newY = 0;
		} else if ( newY < this.maxScrollY ) {
			newY = this.maxScrollY;
		}

		this.scrollTo(newX, newY, 0);

// INSERT POINT: _wheel
	},

	_initSnap: function () {
		this.currentPage = {};
        //如果snap是一个string类型，那么此时的snap就会设置为scroller下的所有的选择器（这个string为参数）的ArrayList集合
		if ( typeof this.options.snap == 'string' ) {
			this.options.snap = this.scroller.querySelectorAll(this.options.snap);
		}
        //为iScroll对象添加一个refresh事件
		this.on('refresh', function () {
			var i = 0, l,//i表示横向滚动的屏数，而l表示纵向滚动的屏数
				m = 0, n,//m表示横向滚动的屏数，而n表示纵向滚动的屏数
				cx, cy,//当前所在的屏的中心位置
				x = 0, y,//当前元素距离scroller元素的距离，为负数
				stepX = this.options.snapStepX || this.wrapperWidth,
				stepY = this.options.snapStepY || this.wrapperHeight,
				//获取包裹元素的宽度和高度。一般滚动一页都会增加wrapper元素的高度和宽度
				el;

			this.pages = [];
			 /*this.pages表示的是如下的格式：
			 [
				 [{cx:-896,cy:-318,height:635,width:1792,x:0,y:0},
				 {cx:-896,cy:-953,height:635,width:1792,x:0,y:-635},
				 {cx:-896,cy:-2223,height:635,width:1792,x:0,y:-1270},
				 {cx:-896,cy:-318,height:635,width:1792,x:0,y:-1365}]
			 ]
			 其中this.wrapperWidth=1792px
			 其中this.wrapperHeight=635px
             */
			if ( !this.wrapperWidth || !this.wrapperHeight || !this.scrollerWidth || !this.scrollerHeight ) {
				return;
			}
             //如果snap为布尔值
			if ( this.options.snap === true ) {
				//cx,cy表示的是包裹元素宽度和高度距离的一半
				//包裹元素wrapper为1792*635,所以cx,cy为896*Math.round(317.5)
				cx = Math.round( stepX / 2 );
				cy = Math.round( stepY / 2 );
                //x表示向左滚动的距离,临界值为scroller的宽度。
                //此处就是-x<this.scrollerWidth，所以这里开始水平方向snap的循环，this.scrollerWidth	= this.scroller.offsetWidth;
				while ( x > -this.scrollerWidth ) {
					//this.scrollerWidth表示的是滚动的scroller的宽度
					this.pages[i] = [];
					l = 0;
					y = 0;
                    //this.scrollerHeight表示scroller的高度
                    //注意：这里的y每次都会减小stepY，所以最后一次不会存在的，因为最后一次就会存在：y=-this.scrollerHeight
					while ( y > -this.scrollerHeight ) {
						this.pages[i][l] = {
							x: Math.max(x, this.maxScrollX),
							//scroller至少为relative定位，此处x表示距离元素的水平距离，其会随着元素的屏幕切换而变化
							//注意：这里的x,y都是负数!!!!，所以等价于：x:Math.min(-x,-this.maxScrollX)，表示取x方向距离左边最小的值
							//而且这里变换的单位量为wrapper的宽度，也就相当于offset
							y: Math.max(y, this.maxScrollY),
							//scroller至少为relative定位，此处y表示距离元素的垂直距离，其会随着元素的屏幕切换而变化
							width: stepX,
							//wrapper元素的宽度
							height: stepY,
							//wrapper元素的高度
							cx: x - cx,
							//表示当前屏幕的中间x位置,只和宽度有关，0-896。
							cy: y - cy
							//表示当前屏幕的中间y位置,只和高度有关，0-318；
							//注意：cx,cy的作用在于，比如cy
							/*
                              第一页的cy值就是wrapper高度的一半的负值。也就是说，只有scroller往上移动的距离小于这个数，那么就应该显示到下一页了!!!!!!
							*/
						};
                        //减去wrapper元素的高度，通过这种方式可以计算得到我们的元素有几个屏幕的高度，
                        //因为每次y的值都会减小其wrapper的高度
						y -= stepY;
						//对于y来说，一开始为0，后面为-1*(wrapperHeight).....-n*(wrapperHeight)
						//所以，我们就会得出结论：cx,cy表示的是当前页面的中心位置，向下的方向为负值!!!
						l++;
					}
                    //水平方向计算可以有几个屏幕的宽度的距离
					x -= stepX;
					i++;
				}
			} else {
		     //如果配置的不是布尔值,而是一个选择器，那么this.options.snap就是scroller下某个选择器选中的元素的集合.
		     //他是通过一次变换一个元素来分割成为不同的页面，这是通过把snap配置成为DOM决定的，而不是配置为true
				el = this.options.snap;
				l = el.length;
				n = -1;
				for ( ; i < l; i++ ) {
					//如果是第一个元素，或者元素的offsetLeft没有变化，那么表示是垂直方向上的变化
					//这时候修改行就可以了，列都是第一列，也就是是0!这样就可以计算出元素可以分为多少列了
					if ( i === 0 || el[i].offsetLeft <= el[i-1].offsetLeft ) {
						m = 0;
						n++;
					}
                    //设置为一个空数组
					if ( !this.pages[m] ) {
						this.pages[m] = [];
					}
					x = Math.max(-el[i].offsetLeft, this.maxScrollX);
					//第i个元素的x方向距离，取其和水平方向滚动距离的最大值
				
					y = Math.max(-el[i].offsetTop, this.maxScrollY);
					//第i的元素的y方向的距离，取其和垂直方向滚动距离的最大值
				
					cx = x - Math.round(el[i].offsetWidth / 2);
					cy = y - Math.round(el[i].offsetHeight / 2);
                    //cx,cy表示的是当前所在页面的中心位置，因为所有的元素都是相对于scroller进行定位的
                    //所以中心就是：元素本身相对于scroller的偏移量减去元素本身的宽度和高度（所以负值会负的越来越大!!!!!!!）
					this.pages[m][n] = {
						x: x,//元素的offsetLeft，和上面的计算是一样的，上面是通过变换wrapper的高度和宽度计算的，而这里是通过元素的offset来计算的!!!!
						y: y,//元素的offsetTop
						width: el[i].offsetWidth,//元素的宽度
						height: el[i].offsetHeight,//元素的高度
						cx: cx,//元素中心相对于scroller移动的距离，也就是元素的中心位置
						cy: cy//元素中心相对于scroller移动的距离，也就是元素的中心位置
					};
                    //如果元素的offsetLeft大于可以滚动的距离，那么就是横向加1
					if ( x > this.maxScrollX ) {
				    //其中this.maxScrollX= this.wrapperWidth - this.scrollerWidth;
				    //表示的是包裹元素的宽度（一般是固定的）和滚动元素的宽度的差值
						m++;
					}
				}
			}
             //默认是第一个页面
			this.goToPage(this.currentPage.pageX || 0, this.currentPage.pageY || 0, 0);
			// Update snap threshold if needed
			//如果是snapThreshold是数字或者数字字符串,但是必须是整数才会%1===0，否则就是else了
			//滑动的长度限制，只有大于这个距离才会触发捕捉元素事件
			if ( this.options.snapThreshold % 1 === 0 ) {
				this.snapThresholdX = this.options.snapThreshold;
				this.snapThresholdY = this.options.snapThreshold;
			} else {
				//this.pages[this.currentPage.pageX][this.currentPage.pageY].width获取的是某一行某一列的元素的宽度，所以
				//snapThresholdX和snapThresholdY表示的是滑动的时候临界距离
				this.snapThresholdX = Math.round(this.pages[this.currentPage.pageX][this.currentPage.pageY].width * this.options.snapThreshold);
				this.snapThresholdY = Math.round(this.pages[this.currentPage.pageX][this.currentPage.pageY].height * this.options.snapThreshold);
			}
		});
       //为iScroll添加一个flick事件
		this.on('flick', function () {
			var time = this.options.snapSpeed || Math.max(
					Math.max(
						Math.min(Math.abs(this.x - this.startX), 1000),
						Math.min(Math.abs(this.y - this.startY), 1000)
					), 300);
            //跳转到特定的页面
			this.goToPage(
				this.currentPage.pageX + this.directionX,
				//directionX用于计算下一页，this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
				this.currentPage.pageY + this.directionY,
				time
			);
		});
	},
  //调用方式：var snap = this.scroller._nearestSnap(this.scroller.x, this.scroller.y);
  //调用时机：在Indicator的end事件中。只有在设置了snap属性的时候需要调用这个方法，也就是根据手指松开时候scroller当前的x和y来决定显示哪一个页面
  //注意：这里的this是iScroll
	_nearestSnap: function (x, y) {
		//如果分页数据为0，那么直接返回0页码
		if ( !this.pages.length ) {
			return { x: 0, y: 0, pageX: 0, pageY: 0 };
		}

		var i = 0,
			l = this.pages.length,
			m = 0;

		// Check if we exceeded the snap threshold
		//this.absStartX = this.x;出现在iScroll的_start中，也就是在iScroll开始滚动的时候的iScroll的x和y坐标
		//在Indicator的_end事件中，我们重新获取了iScroll的位置信息，然后比较两次变化的距离。如果iScroll变化的距离小于
		if ( Math.abs(x - this.absStartX) < this.snapThresholdX &&
			Math.abs(y - this.absStartY) < this.snapThresholdY ) {
			return this.currentPage;
		}
        //如果手指松开的时候iScroll.x>0，那么显示在第一页。如果小于this.maxScrollX，表示已经到右边还不断的往右边移动，这时候
        //直接显示最右边的就可以了（这时候的this是iScroll对象）
		if ( x > 0 ) {
			x = 0;
		} else if ( x < this.maxScrollX ) {
			x = this.maxScrollX;
		}
        //如果y大于0，那么显示为0
        //如果y<this.maxScrollY，表示已经移动到最顶部了，还在往上面移动，这时候显示最下面的这部分就可以了.
        //this.y/this.x表示iScroll元素的距离
		if ( y > 0 ) {
			y = 0;
		} else if ( y < this.maxScrollY ) {
			y = this.maxScrollY;
		}
        //l表示有多少列,第一列，第二列.....
        //其中x表示要移动到的位置。其中x为负数，这个应该很容易理解的，所以下面的判断就是-x<=this.pages[i][0].cx，也就是找到该页码的中心位置要比要移动到的距离大一点的那一页
		//得到这个x表示要移动到的那一页的offset
		for ( ; i < l; i++ ) {
			if ( x >= this.pages[i][0].cx ) {
				x = this.pages[i][0].x;
				break;
			}
		}
         //我们现在判断最后一列了，表示该列有多少行
		l = this.pages[i].length;
        //如果大于第一列的m行的中心位置，那么y就是该列的m行的offset值
		for ( ; m < l; m++ ) {
			if ( y >= this.pages[0][m].cy ) {
			//-y<=this.pages[0][m].cy，目的就是寻找一个页面，其中心位置大于要移动到的y的位置就行
				y = this.pages[0][m].y;
				break;
			}
		}
        //因为上面的for循环满足条件直接调用break,所以i最后的值就是表示应该所在的页的下标值。
        //如果要移动到的页就是当前页
		if ( i == this.currentPage.pageX ) {
			i += this.directionX;
            /*
              this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
    		  this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;
    		  手指向上滑动，deltaY<0,所以this.directionY为1；手指向下滑动deltaY>0,所以this.directionY为-1
    		  手指向右滑动，deltaX>0，this.directionX为-1
            */
			if ( i < 0 ) {
             //如果要显示的页码都要小于0了，那么我们直接显示第0页就可以了
				i = 0;
			} else if ( i >= this.pages.length ) {
				//如果要显示的页码都要大于length了，那么我们直接显示第length页就可以了
				i = this.pages.length - 1;
			}
            //x等于第i列的第1行的offset值
			x = this.pages[i][0].x;
		}
        
        //如果要显示的行就是当前的行
		if ( m == this.currentPage.pageY ) {
			m += this.directionY;
            //如果行数小于0那么显示第一行
			if ( m < 0 ) {
				m = 0;
				//如果显示的行大于length行，那么显示最后一行
			} else if ( m >= this.pages[0].length ) {
				m = this.pages[0].length - 1;
			}

			y = this.pages[0][m].y;
		}

		return {
			x: x,//x，y表示iScroll应该移动到的新的位置
			y: y,
			pageX: i,//pageX,pageY保存的是应该移动的页码
			pageY: m
		};
	},


    //移动到指定的页码。表示滚动到水平方向的x页，垂直方向的y页
	goToPage: function (x, y, time, easing) {
		easing = easing || this.options.bounceEasing;
	    //this.pages.length表示与多少列，而x表示滚动到水平方向的多少列
		if ( x >= this.pages.length ) {
			x = this.pages.length - 1;
			//如果页数太多，那么一直保持到最后一页
		} else if ( x < 0 ) {
			//如果水平页数小于0，那么就停留到第一页
			x = 0;
		}
		//表示在水平x页码，this.pages[x].length表示水平x页码的多少行
		if ( y >= this.pages[x].length ) {
			//行数太大，保留到最后一行
			y = this.pages[x].length - 1;
		} else if ( y < 0 ) {
			//否则到第一行
			y = 0;
		}

		var posX = this.pages[x][y].x,
			posY = this.pages[x][y].y;
			//多少行，多少列的x,y属性

		time = time === undefined ? this.options.snapSpeed || Math.max(
			Math.max(
				//posX目标页面的位置；this.x当前scroller的位置
				Math.min(Math.abs(posX - this.x), 1000),
				Math.min(Math.abs(posY - this.y), 1000)
			), 300) : time;
		//移动到指定列的时间

		this.currentPage = {
			x: posX,//更新水平位置
			y: posY,//更新垂直位置
			pageX: x,//更新页码
			pageY: y
		};
        //所以移动到指定的页码还是通过scrollTo来完成的，只是移动之前要计算要移动到的元素的坐标进而调用scrollTo来完成
		this.scrollTo(posX, posY, time, easing);
	},

	next: function (time, easing) {
		var x = this.currentPage.pageX,
			y = this.currentPage.pageY;
		x++;
		//水平方向加1，如果水平方向已经到了最后，同时有垂直方向，那么回到第一列同时垂直方向滚动一下。
		if ( x >= this.pages.length && this.hasVerticalScroll ) {
			x = 0;
			y++;
		}
		this.goToPage(x, y, time, easing);
	},

	prev: function (time, easing) {
		var x = this.currentPage.pageX,
			y = this.currentPage.pageY;
         //x减小
		x--;
        //保证到第一屏，同时y--，也就是纵向往上一屏
		if ( x < 0 && this.hasVerticalScroll ) {
			x = 0;
			y--;
		}

		this.goToPage(x, y, time, easing);
	},

	_initKeys: function (e) {
		// default key bindings
		var keys = {
			pageUp: 33,//fn+向上键
			pageDown: 34,//fn+向下键
			end: 35,//fn+向右键
			home: 36,//fn+向左键
			left: 37,
			up: 38,
			right: 39,
			down: 40
		};
		var i;

		// if you give me characters I give you keycode
		//如果是为keyBindings对象的属性值指定了string，那么我们就会获取到第一个字符的charCode值，而不是其string值
		if ( typeof this.options.keyBindings == 'object' ) {
			for ( i in this.options.keyBindings ) {
				if ( typeof this.options.keyBindings[i] == 'string' ) {
					this.options.keyBindings[i] = this.options.keyBindings[i].toUpperCase().charCodeAt(0);
				}
			}
		} else {
			this.options.keyBindings = {};
		}

		for ( i in keys ) {
			this.options.keyBindings[i] = this.options.keyBindings[i] || keys[i];
		}
        //把事件绑定到window对象上的
		utils.addEvent(window, 'keydown', this);

		this.on('destroy', function () {
			utils.removeEvent(window, 'keydown', this);
		});
	},

   //监听keydown事件的函数
   //http://bbs.feng.com/read-htm-tid-811263.html
   //（1）注意：newX,newY是iScroll中的scroller相对于wrapper来说的，如果为负数表示scroller左边已经插入到wrapper左边的内部了
   //（2）注意：我们在计算scroller元素的位置，都是相对于wrapper元素的上面开始计算的，这一点一定要注意，也是计算newX/newY的核心思想
   // (3)this.keyAcceleration>>0表示向右移动0位，其值还是不变的。但是如果是小数，1.23>>0，那么值就是1，相当于取整数部分
	_key: function (e) {
		//如果没有启用iScroll，那么直接返回
		if ( !this.enabled ) {
			return;
		}
		var snap = this.options.snap,	// we are using this alot, better to cache it
			newX = snap ? this.currentPage.pageX : this.x,
			newY = snap ? this.currentPage.pageY : this.y,
			//如果使用了分页，那么获取当前页面，如果没有分页那么获取iScroll当前所在的位置
			now = utils.getTime(),
			prevTime = this.keyTime || 0,
			//获取iScroll的keyTime，
			acceleration = 0.250,
			pos;
        //如果使用了transition同时也在滚动
		if ( this.options.useTransition && this.isInTransition ) {
			pos = this.getComputedPosition();
            //移动到iScroll的x/y坐标
			this._translate(Math.round(pos.x), Math.round(pos.y));
			this.isInTransition = false;
		}
        //绑定keyAcceleration属性，如果两次按键之间小于200ms，那么this.keyAcceleration用于绑定加速，加速的this.keyAcceleration<=50
        //如果两次之间大于200ms，那么不是用于加速的。只有当两次按键之间间隔很小的时候表示用于加速，加速度为上一次加速度+0.250
		this.keyAcceleration = now - prevTime < 200 ? Math.min(this.keyAcceleration + acceleration, 50) : 0;

		switch ( e.keyCode ) {
			//如果是上一页，fn+向上键
			case this.options.keyBindings.pageUp:
			     //如果只有水平滚动条，而没有垂直滚动条，那么pageUp就是翻页到水平方向的新的页面；否则就是变换垂直翻页
				if ( this.hasHorizontalScroll && !this.hasVerticalScroll ) {
					newX += snap ? 1 : this.wrapperWidth;
				} else {
					newY += snap ? 1 : this.wrapperHeight;
				}
				break;
			case this.options.keyBindings.pageDown:
			  //如果是向下按键,那么向左移动
				if ( this.hasHorizontalScroll && !this.hasVerticalScroll ) {
					newX -= snap ? 1 : this.wrapperWidth;
				} else {
					newY -= snap ? 1 : this.wrapperHeight;
				}
				break;
				//如果是fn+右键，这时候就是显示最后一页。是水平和垂直方向都是最后一页的
			case this.options.keyBindings.end:
				newX = snap ? this.pages.length-1 : this.maxScrollX;
				newY = snap ? this.pages[0].length-1 : this.maxScrollY;
				break;
				//fn+左键=home按键，这时候显示垂直和水平的第一页
			case this.options.keyBindings.home:
				newX = 0;
				newY = 0;
				break;
				//如果是左键，那么scroller左边进入到wrapper元素的部分会缩小
			case this.options.keyBindings.left:
				newX += snap ? -1 : 5 + this.keyAcceleration>>0;
				break;
				//如果向上，那么scroller元素就会往下移动，也就是插入到wrapper元素的scroller元素空间会缩短
			case this.options.keyBindings.up:
				newY += snap ? 1 : 5 + this.keyAcceleration>>0;
				break;
				//右键的时候，那么scroller元素就会往左插入到wrapper元素中去
			case this.options.keyBindings.right:
				newX -= snap ? -1 : 5 + this.keyAcceleration>>0;
				break;
				//如果向下，那么scroller元素就会往上插入到wrapper元素中去
			case this.options.keyBindings.down:
				newY -= snap ? 1 : 5 + this.keyAcceleration>>0;
				break;
			default:
				return;
		}

		if ( snap ) {
			//移动到新的页码
			this.goToPage(newX, newY);
			return;
		}
		//如果newX>0，那么我们显示到第一列，同时this.keyAcceleration=0
		if ( newX > 0 ) {
			newX = 0;
			this.keyAcceleration = 0;
			//如果newX < this.maxScrollX表示已经到最右边了，但是你还是往右边，这时候保持到最右边就可以了。
		} else if ( newX < this.maxScrollX ) {
			newX = this.maxScrollX;
			this.keyAcceleration = 0;
		}
		//如果已经到最上面了，这时候我们保持到垂直方向上第一列就可以了
		if ( newY > 0 ) {
			newY = 0;
			this.keyAcceleration = 0;
		//如果已经滚动到最下面了，这时候我们保持到最下面就可以了
		} else if ( newY < this.maxScrollY ) {
			newY = this.maxScrollY;
			this.keyAcceleration = 0;
		}
        //更新scroller元素的位置
		this.scrollTo(newX, newY, 0);
        //为iScroll元素指定一个keyTime，用于保持当前按键后，也就是响应按键，scroller元素移动到特定的位置时候的时间!!用于当第二次按键的使用做判断
		this.keyTime = now;
	},

    //使用animation动画调用方式为	this._animate(x, y, time, easing.fn);
    //这个step函数就是分很多步来计算和移动到最终位置
	_animate: function (destX, destY, duration, easingFn) {
		var that = this,
			startX = this.x,
			startY = this.y,
			//获取当前iScroll的位置
			startTime = utils.getTime(),
			//获取当前时间
			destTime = startTime + duration;
           //结束时间的计算
		function step () {
			var now = utils.getTime(),
				newX, newY,
				easing;
            //比较当前时间和结束时间，如果当前时间比结束时间还大表示动画已经结束了，isAnimating设置为false
			if ( now >= destTime ) {
				that.isAnimating = false;
				that._translate(destX, destY);
				//我们直接移动到最终的位置就可以了，这时候你会看到我们设置持续时间
				if ( !that.resetPosition(that.options.bounceTime) ) {
					that._execEvent('scrollEnd');
					//触发scrollEnd事件
				}
				return;
			}

			now = ( now - startTime ) / duration;
			//当前时间-开始时间/持续时间，得到一个小于1的数字，然后转化为我们的Easing函数的参数传入得到一个值!
			easing = easingFn(now);
		    //上面计算得到的值乘以destX-startX，然后加上startX就是我们当前的新的坐标值
			newX = ( destX - startX ) * easing + startX;
			newY = ( destY - startY ) * easing + startY;
			that._translate(newX, newY);
            //得到新的坐标值后我们继续通过left/top或者transform来完成计算就可以了
			if ( that.isAnimating ) {
				rAF(step);
				//到下一帧我们继续调用step函数
			}
		}
		this.isAnimating = true;
		//isAnimating设置为true表示开始动画，并调用step方法
		step();
	},
	handleEvent: function (e) {
		switch ( e.type ) {
			case 'touchstart':
			case 'pointerdown':
			case 'MSPointerDown':
			case 'mousedown':
				this._start(e);//调用_start
				break;
			case 'touchmove':
			case 'pointermove':
			case 'MSPointerMove':
			case 'mousemove':
				this._move(e);//调用_move方法
				break;
			case 'touchend':
			case 'pointerup':
			case 'MSPointerUp':
			case 'mouseup':
			case 'touchcancel':
			case 'pointercancel':
			case 'MSPointerCancel':
			case 'mousecancel':
				this._end(e);//触发_end方法
				break;
			case 'orientationchange':
			case 'resize':
				this._resize();//resize或者屏幕位置发生变化那么触发
				break;
			case 'transitionend':
			case 'webkitTransitionEnd':
			case 'oTransitionEnd':
			case 'MSTransitionEnd':
				this._transitionEnd(e);
				break;
			case 'wheel':
			case 'DOMMouseScroll':
			case 'mousewheel':
				this._wheel(e);//wheel，DOMMouseScroll，mousewheel
				break;
			case 'keydown':
				this._key(e);//响应键盘事件
				break;
			case 'click':
				if ( this.enabled && !e._constructed ) {
					e.preventDefault();
					e.stopPropagation();
				}
				break;
		}
	}
};


//调用方式el: createDefaultScrollbar('v', interactive, this.options.scrollbars)
//interative表示是否可以交互， this.options.scrollbars表示是否有滚动条
function createDefaultScrollbar (direction, interactive, type) {
	var scrollbar = document.createElement('div'),
		indicator = document.createElement('div');
    //如果含有滚动条，那么我们给滚动条设置absolute定位
	if ( type === true ) {
		scrollbar.style.cssText = 'position:absolute;z-index:9999';
		indicator.style.cssText = '-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.9);border-radius:3px';
	}
    //indicator含有className为iScrollIndicator
	indicator.className = 'iScrollIndicator';
    //如果方向是水平的滚动条同时也有滚动条
	if ( direction == 'h' ) {
		if ( type === true ) {
			scrollbar.style.cssText += ';height:7px;left:2px;right:2px;bottom:0';
			indicator.style.height = '100%';
		}
		scrollbar.className = 'iScrollHorizontalScrollbar';
	} else {
		//如果是垂直方向的滚动条
		if ( type === true ) {
			scrollbar.style.cssText += ';width:7px;bottom:2px;top:2px;right:1px';
			indicator.style.width = '100%';
		}
		scrollbar.className = 'iScrollVerticalScrollbar';
	}

	scrollbar.style.cssText += ';overflow:hidden';
    
    //如果interactive为false表示不允许响应事件，那么为scrollbar元素的style添加pointerEvents为"none"就可以了，默认是""空字符串
	if ( !interactive ) {
		scrollbar.style.pointerEvents = 'none';
	}
   //scrollbar添加子元素为indicator元素
   /*
      垂直方向的scrolbar元素：width:7x，同时是相对于wrapper来定位的。同时指定了top和bottom，那么就是表示高度是屏幕高度-bottom-top，同时距离右边为1px。这就确定了滚动条的位置
      <div id="scrollbar" class="iScrollVerticalScrollbar" style="position:absolute;z-index:9999;width:7px;bottom:2px;top:2px;right:1px;overflow:hidden;">
         <div id="indicator" class="iScrollIndicator" style="box-sizing:border-box;position:absolute;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.9);border-radius:3px;width:100%"></div>
      </div>
   */
	scrollbar.appendChild(indicator);
	return scrollbar;
}

//调用方式：new Indicator(this, indicators[i]) 
//这里返回的是Indicator对象，indicator对象的wrapper就是我们自己指定的wapper，可以是string或者DOM类型
/*
     	indicator = {
					el: createDefaultScrollbar('v', interactive, this.options.scrollbars),
					interactive: interactive,//表示用户是否可以拖动滚动条
					defaultScrollbars: true,//defaultScrollbars默认为true
					customStyle: customStyle,//如果不是字符串，那么表示自定义的类型。
					resize: this.options.resizeScrollbars,//滚动条的大小基于wapper和scroller的width/height的比例，如果把这个属性设置为false那么可以设置固定的大小滚动条。这在设置自定义的滚动条的时候特别有用
					shrink: this.options.shrinkScrollbars,//是否缩小scrollbars，有效的值为'clip','scale',false
					fade: this.options.fadeScrollbars,//当没有使用滚动的时候，我们的滚动条会消失。让这个选项保持为false可以节省资源
					listenX: false
				};
				this.wrapper.appendChild(indicator.el);
				//所以成了下面的DOM结构
                   <div id="wrapper">
                      <div id="scrollbar" class="iScrollVerticalScrollbar" style="position:absolute;z-index:9999;width:7px;bottom:2px;top:2px;right:1px;overflow:hidden;">
                         <div id="indicator" class="iScrollIndicator" style="box-sizing:border-box;position:absolute;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.9);border-radius:3px;width:100%"></div>
                      </div>
                    </div>
				indicators.push(indicator);
				//同时把这个indicator放入我们的数组

*/











//注意：这里创建Indicator是基于上面对滚动条的创建来完成的，其中Indicator的wrapper属性就是对滚动条的包裹元素，即scrollbar滚动槽元素的引用!
function Indicator (scroller, options) {
	this.wrapper = typeof options.el == 'string' ? document.querySelector(options.el) : options.el;
	//wrapper自己指定(此处的wrapper是Indicator对象具有的wrapper)。返回的DOM结构为<div id="scrollbar"><div id="indicator"></div></div>,也就是wrapper对象就是内部的scrollbar元素DOM。
	//因为这里构造的是Indicator对象，所以其wrapper当然就是scrollbar元素。如果是创建指示元素那么其wrapper就表示我们自己通过el指定
	this.wrapperStyle = this.wrapper.style;
	//scrollbar元素的style属性
	this.indicator = this.wrapper.children[0];
	//获取indticator属性，也是一个DOM
	this.indicatorStyle = this.indicator.style;
	//获取indicator的style属性
	this.scroller = scroller;
    //indicator的scroller属性持有的就是iScroll元素的引用
	this.options = {
		listenX: true,//表示监听X轴
		listenY: true,//表示监听Y轴
		interactive: false,//可以操作
		resize: true,//滚动条的大小是基于wrapper和scroller的width/height来设定的，通过设置resizeScrollbars可以把滚动条设置为一个指定的大小
		defaultScrollbars: false,
		shrink: false,
		fade: false,//fade
		speedRatioX: 0,//指示元素的移动速度是根据sroller的大小来设定的。默认情况下是自动设置的，一般yuansu不需要改变这个值
		speedRatioY: 0//指示元素的移动速度是根据sroller的大小来设定的。默认情况下是自动设置的，一般不需要改变这个值
	};
     //绑定listenX，listenY，speedRatioX，speedRatioY，shrink，fade属性等
	for ( var i in options ) {
		this.options[i] = options[i];
	}

	this.sizeRatioX = 1;
	this.sizeRatioY = 1;
	this.maxPosX = 0;
	this.maxPosY = 0;

	if ( this.options.interactive ) {
		//如果可以是touch事件，那么我们为Indicator添加touchstart,touchend事件
		if ( !this.options.disableTouch ) {
			utils.addEvent(this.indicator, 'touchstart', this);
			utils.addEvent(window, 'touchend', this);
		}
		//如果可以有pointer事件，我们为Indicator添加pointerdown,pointerup事件
		if ( !this.options.disablePointer ) {
			utils.addEvent(this.indicator, utils.prefixPointerEvent('pointerdown'), this);
			utils.addEvent(window, utils.prefixPointerEvent('pointerup'), this);
		}
		//为Indicator添加mousedown,mouseup事件
		if ( !this.options.disableMouse ) {
			utils.addEvent(this.indicator, 'mousedown', this);
			utils.addEvent(window, 'mouseup', this);
		}
	}
    //如果没有操作滚动条就消失，fade对应于this.options.fadeScrollbars
	if ( this.options.fade ) {
		//为iscrollbar元素添加transform属性，也就是启动硬件加速
		this.wrapperStyle[utils.style.transform] = this.scroller.translateZ;
		var durationProp = utils.style.transitionDuration;
		if(!durationProp) {
			return;
		}
		//为scrollbar元素添加transition-duration属性
		this.wrapperStyle[durationProp] = utils.isBadAndroid ? '0.0001ms' : '0ms';
		// remove 0.0001ms
		var self = this;
		if(utils.isBadAndroid) {
			rAF(function() {
				if(self.wrapperStyle[durationProp] === '0.0001ms') {
					self.wrapperStyle[durationProp] = '0s';
				}
			});
		}
		//为我们的scrollbar元素添加opaitcity，然后让它开始执行transform动画
		this.wrapperStyle.opacity = '0';
	}
}

//滚动条事件处理
Indicator.prototype = {
	handleEvent: function (e) {
		switch ( e.type ) {
			case 'touchstart':
			case 'pointerdown':
			case 'MSPointerDown':
			case 'mousedown':
				this._start(e);//开始
				break;
			case 'touchmove':
			case 'pointermove':
			case 'MSPointerMove':
			case 'mousemove':
				this._move(e);//滚动条中移动
				break;
			case 'touchend':
			case 'pointerup':
			case 'MSPointerUp':
			case 'mouseup':
			case 'touchcancel':
			case 'pointercancel':
			case 'MSPointerCancel':
			case 'mousecancel':
				this._end(e);//结束移动滚动条
				break;
		}
	},

	destroy: function () {
		if ( this.options.fadeScrollbars ) {
			clearTimeout(this.fadeTimeout);
			this.fadeTimeout = null;
		}
		if ( this.options.interactive ) {
			utils.removeEvent(this.indicator, 'touchstart', this);
			utils.removeEvent(this.indicator, utils.prefixPointerEvent('pointerdown'), this);
			utils.removeEvent(this.indicator, 'mousedown', this);

			utils.removeEvent(window, 'touchmove', this);
			utils.removeEvent(window, utils.prefixPointerEvent('pointermove'), this);
			utils.removeEvent(window, 'mousemove', this);

			utils.removeEvent(window, 'touchend', this);
			utils.removeEvent(window, utils.prefixPointerEvent('pointerup'), this);
			utils.removeEvent(window, 'mouseup', this);
		}

		if ( this.options.defaultScrollbars ) {
			this.wrapper.parentNode.removeChild(this.wrapper);
		}
	},

     //这里的this是滚动条而不是滚动槽。_start就是刚刚触摸到滚动条的时候进行的处理
	_start: function (e) {
		var point = e.touches ? e.touches[0] : e;
		e.preventDefault();
		e.stopPropagation();
		//阻止冒泡和默认行为
		this.transitionTime();
		//设置initiated为true
		this.initiated = true;
		this.moved = false;
		//保存当前的触点的位置
		this.lastPointX	= point.pageX;
		this.lastPointY	= point.pageY;
		this.startTime	= utils.getTime();
         //添加touchmove/pointermove/mousemove事件
		if ( !this.options.disableTouch ) {
			utils.addEvent(window, 'touchmove', this);
		}
		if ( !this.options.disablePointer ) {
			utils.addEvent(window, utils.prefixPointerEvent('pointermove'), this);
		}
		if ( !this.options.disableMouse ) {
			utils.addEvent(window, 'mousemove', this);
		}
        //刚刚触摸到滚动条，所以还没有开始滚动，所以触发beforeScrollStart事件
		this.scroller._execEvent('beforeScrollStart');
	},

	_move: function (e) {
		var point = e.touches ? e.touches[0] : e,
			deltaX, deltaY,
			newX, newY,
			timestamp = utils.getTime();
        //this.moved值在_start中是false,所以只会触发一次scrollstart事件
		if ( !this.moved ) {
			this.scroller._execEvent('scrollStart');
		}
        //开始移动了
		this.moved = true;

		deltaX = point.pageX - this.lastPointX;
		this.lastPointX = point.pageX;

		deltaY = point.pageY - this.lastPointY;
		this.lastPointY = point.pageY;
        //更新滚动条的lastPointY/lastPointX，同时计算出手指距离的变化量
		newX = this.x + deltaX;
		newY = this.y + deltaY;
        //滚动条新的位置=滚动条当前的位置+手指移动变化量
		this._pos(newX, newY);
// INSERT POINT: indicator._move

		e.preventDefault();
		e.stopPropagation();
	},

   //调用方式this._end(e)用于事件处理函数，其中this表示滚动条
	_end: function (e) {
		if ( !this.initiated ) {
			return;
		}

		this.initiated = false;
		//重置initiated为false
		e.preventDefault();
		e.stopPropagation();
        //在_start中添加_move事件，在_end中移除move相关事件
		utils.removeEvent(window, 'touchmove', this);
		utils.removeEvent(window, utils.prefixPointerEvent('pointermove'), this);
		utils.removeEvent(window, 'mousemove', this);

		if ( this.scroller.options.snap ) {
			//如果配置了分页了,这里的Indicator有一个scroller属性表示的就是Iscroll的引用。这时候按理说已经停止滚动了，但是因为
			//已经有了翻页，所以我们还要由于翻页的存在再次移动scroller元素!!!!
			var snap = this.scroller._nearestSnap(this.scroller.x, this.scroller.y);
            
            //获取页面切换的时间，如果没有配置snapSpeed,那么时间自己计算
			var time = this.options.snapSpeed || Math.max(
					Math.max(
						Math.min(Math.abs(this.scroller.x - snap.x), 1000),
						Math.min(Math.abs(this.scroller.y - snap.y), 1000)
					), 300);
           //只要scroller当前所在的位置和分页后应该所在的位置不相同，那么就要把scroller移动到指定的位置
			if ( this.scroller.x != snap.x || this.scroller.y != snap.y ) {
				this.scroller.directionX = 0;
				this.scroller.directionY = 0;
				//重置directionX，directionY属性为0
				this.scroller.currentPage = snap;
				//重置当前页面的信息,snap返回的是当前对象
				/*
                  return {
					x: x,//x，y表示iScroll应该移动到的新的位置
					y: y,
					pageX: i,//pageX,pageY保存的是应该移动的页码
					pageY: m
				};
				*/
				this.scroller.scrollTo(snap.x, snap.y, time, this.scroller.options.bounceEasing);
			}
		}
        //如果还是在移动，表示_move，我们应该触发"scrollEnd"事件
		if ( this.moved ) {
			this.scroller._execEvent('scrollEnd');
		}
	},

   //注意：我们滚动的时候其实设置transition-time是设置scroller元素和indicator属性 
	transitionTime: function (time) {
		time = time || 0;
		var durationProp = utils.style.transitionDuration;
		if(!durationProp) {
			return;
		}
        //this.indicatorStyle，对于滚动条来说指定的是scroller元素的style，对于indicator元素来说其指向的是indicators.el属性的第一个子元素
        //这一点一定要注意弄清楚
		this.indicatorStyle[durationProp] = time + 'ms';
        //如果是特定版本的android属性，那么应该要做相应的hack
		if ( !time && utils.isBadAndroid ) {
			this.indicatorStyle[durationProp] = '0.0001ms';
			// remove 0.0001ms
			var self = this;
			rAF(function() {
				if(self.indicatorStyle[durationProp] === '0.0001ms') {
					self.indicatorStyle[durationProp] = '0s';
				}
			});
		}
	},
    //设置transition-function函数
	transitionTimingFunction: function (easing) {
		this.indicatorStyle[utils.style.transitionTimingFunction] = easing;
	},



    //调用方式：this.refresh()，这里的this是Indicator对象，而不是我们的iScroll对象
    //注意：这里是设置wrapper的style，对于滚动条来说就是滚动槽的bottom和right，也就是说这个时候的高度和宽度不是100%而已
    //customStyle = typeof this.options.scrollbars != 'string'。只有构造函数中的scrollbars参数不是string的时候this.options.scrollbars才会为true

	refresh: function () {
		this.transitionTime();
        //如果listenX，也就是监听X轴的滚动，这时候把indicator元素设置为block
		if ( this.options.listenX && !this.options.listenY ) {
			this.indicatorStyle.display = this.scroller.hasHorizontalScroll ? 'block' : 'none';
		} else if ( this.options.listenY && !this.options.listenX ) {
			//如果listenY，那么我们直接把scroller设置为block
			this.indicatorStyle.display = this.scroller.hasVerticalScroll ? 'block' : 'none';
		} else {
			//否则两者都设置。这里是设置滚动条或者指示元素Indicator
			this.indicatorStyle.display = this.scroller.hasHorizontalScroll || this.scroller.hasVerticalScroll ? 'block' : 'none';
		}
         //如果垂直和水平方向都会有滚动条(计算高度和宽度就行)，那么我们给wrapper，也就是滚动槽添加一个类‘iScrollBothScrollbars’。这时候两个方向会有两个滚动槽的，如下：
         /*
		<div class="iScrollVerticalScrollbar iScrollBothScrollbars" style="overflow: hidden; pointer-events: none;">
		      <div class="iScrollIndicator" style="transition-duration: 0ms; display: block; height: 170px; transform: translate(0px, 0px) translateZ(0px); transition-timing-function: cubic-bezier(0.1, 0.57, 0.1, 1);"></div>
		</div>
         <div class="iScrollHorizontalScrollbar iScrollBothScrollbars" style="overflow: hidden; pointer-events: none;">
             <div class="iScrollIndicator" style="transition-duration: 0ms; display: block; width: 1862px; transform: translate(0px, 0px) translateZ(0px); transition-timing-function: cubic-bezier(0.1, 0.57, 0.1, 1);"></div>
         </div>
         两个滚动槽都添加了这个类"iScrollBothScrollbars"
         */
		if ( this.scroller.hasHorizontalScroll && this.scroller.hasVerticalScroll ) {
			utils.addClass(this.wrapper, 'iScrollBothScrollbars');
			utils.removeClass(this.wrapper, 'iScrollLoneScrollbar');
            //如果有defaultScrollbars同时也设置了customStyle，那么给滚动槽添加right/bottom值。如果是双向滚动条
            //为了让垂直和水平滚动条之间不至于在右边靠得太近，我们设置了8px的距离
			if ( this.options.defaultScrollbars && this.options.customStyle ) {
				//this.options.customStyle要为true，只有一种可能就是： { scrollX: true, scrollbars: 'custom' }里面的scrollbars的值不是字符串string类型
				if ( this.options.listenX ) {
					this.wrapper.style.right = '8px';
				} else {
					this.wrapper.style.bottom = '8px';
				}
			}
		} else {
			//如果只有一个方向的滚动条，给滚动槽添加iScrollLoneScrollbar
			utils.removeClass(this.wrapper, 'iScrollBothScrollbars');
			utils.addClass(this.wrapper, 'iScrollLoneScrollbar');
            //如果是单向的滚动条，这时候设置right为2px
			if ( this.options.defaultScrollbars && this.options.customStyle ) {
				if ( this.options.listenX ) {
					//滚动槽在右边的和下边的距离在这里进行设置
					this.wrapper.style.right = '2px';
				} else {
					this.wrapper.style.bottom = '2px';

				}
			}
		}
        //获取滚动槽/指示元素Indicator的offset值
		var r = this.wrapper.offsetHeight;	// force refresh
		if ( this.options.listenX ) {
			//如果监听X轴滚动,this.wrapperWidth表示的是滚动槽/Indicator包裹元素的宽度
			this.wrapperWidth = this.wrapper.clientWidth;
			//resize表示根据wrapper和scroller大小确定，indicatorWidth也就是滚动条的宽度至少也是8px
			if ( this.options.resize ) {
				this.indicatorWidth = Math.max(Math.round(this.wrapperWidth * this.wrapperWidth / (this.scroller.scrollerWidth || this.wrapperWidth || 1)), 8);
				this.indicatorStyle.width = this.indicatorWidth + 'px';
			} else {
			//如果没有设置resize，那么我们不会通过滚动槽的宽度来设置滚动条的宽度，而是直接获取indicator对象的clientWidth属性
				this.indicatorWidth = this.indicator.clientWidth;
			}
			this.maxPosX = this.wrapperWidth - this.indicatorWidth;
            //maxPosX表示滚动槽的宽度减去滚动条的宽度
            /*
	            myScroll = new IScroll('#wrapper', {
					scrollbars: true,
					mouseWheel: true,
					interactiveScrollbars: true,
					shrinkScrollbars: 'scale',
					 fadeScrollbars: false,
					 shrinkScrollbars:'clip'
			 });
			 通过这个例子：当已经滚动到底部的时候你继续往下拉就会发现，clip/scale的本质区别，scale会收缩成为一个点，但是clip不会!
	       */
			if ( this.options.shrink == 'clip' ) {
				//如果是clip，那么滚动条最小只能比正常小8px，但是如果是'scale'那么可以缩小为一个点
				this.minBoundaryX = -this.indicatorWidth + 8;
				this.maxBoundaryX = this.wrapperWidth - 8;
				//如果在左边那么至少有8px存在，在右边也至少有8px的存在。this.wrapperWidth表示滚动槽的宽度，this.wrapperWidth - 8表示不能到滚动槽外面去了
			} else {
				//否则最小是收缩成为一点，最大是滚动条本身的宽度
				this.minBoundaryX = 0;
				this.maxBoundaryX = this.maxPosX;
			}
             //this.options.speedRatioX表示在scroller中indicator移动的速度（自动计算），一般保持0就好不需要改动
             //所以sizeRatioX表示的是水平滚动的速度，如果用户没有指定speedRatioX那么就会自动计算滚动的速度。
             //Indicator的scroller表示的是iScroll对象,所以this.scroller.maxScrollX表示的是iScroll对象水平方向可以滚动的最大距离
             //this.maxPosX表示的是滚动槽的宽度减去滚动条的宽度
			this.sizeRatioX = this.options.speedRatioX || (this.scroller.maxScrollX && (this.maxPosX / this.scroller.maxScrollX));
		}
          //如果监听Y方向的移动
		if ( this.options.listenY ) {
			this.wrapperHeight = this.wrapper.clientHeight;
			//滚动槽的高度
			if ( this.options.resize ) {
				//自动设置滚动条的高度，根据:滚动槽的高度的平方/iScroll元素的高度，如果高度小于8那么设置为8px的高度
				this.indicatorHeight = Math.max(Math.round(this.wrapperHeight * this.wrapperHeight / (this.scroller.scrollerHeight || this.wrapperHeight || 1)), 8);
				this.indicatorStyle.height = this.indicatorHeight + 'px';
			} else {
				//如果没有设置resize,这时候this.indicatorHeight就是滚动条的高度!
				this.indicatorHeight = this.indicator.clientHeight;
			}
			this.maxPosY = this.wrapperHeight - this.indicatorHeight;
            //this.maxPosY=滚动槽的高度-滚动条的高度-滚动条的border，其表示在纵向可以滚动的最大值
            //minBoundaryY,maxBoundaryY表示的是滚动条的最小和最大的位置信息
			if ( this.options.shrink == 'clip' ) {
				//这里的this都是滚动条而不是滚动槽，所以是获取滚动条滑动时候的临界值
				this.minBoundaryY = -this.indicatorHeight + 8;
				//-215+8=-207，其中-215表示的是滚动条的高度。minBoundaryY
				this.maxBoundaryY = this.wrapperHeight - 8;
				//656-8=648，其中656是滚动槽的高度，所以maxBoundaryY=滚动槽的高度-8(间距)
			} else {
				this.minBoundaryY = 0;
				this.maxBoundaryY = this.maxPosY;
			}
			this.maxPosY = this.wrapperHeight - this.indicatorHeight;
			//sizeRatioY表示垂直方向应该滚动的速度。
			//this.scroller.maxScrollY=wrapperHeight-scrollerHeight，也就是说表示的是滚动元素相对于定高元素少了的高度,所以得到的是可以滚动的高度
			//this.maxPosY表示滚动槽相对于滚动条的差值，所以滚动条滚动的速度就是通过：滚动条可以滚动的距离/元素总共可以滚动的距离。
			//滚动条路程/滚动条速度=元素路程/元素速度=>元素路程/滚动条路程=元素速度/滚动条速度=>滚动条应该移动的路程/元素应该移动的路程=滚动条速度/元素速度=>也等于变化量的比值!!!
			this.sizeRatioY = this.options.speedRatioY || (this.scroller.maxScrollY && (this.maxPosY / this.scroller.maxScrollY));
		}
        //this为Indicator调用
		this.updatePosition();
	},

	updatePosition: function () {
		/*
       if ( this.options.shrink == 'clip' ) {
				// this.minBoundaryY = -this.indicatorHeight + 8;
                this.minBoundaryY = -this.indicatorHeight + 8;
				this.maxBoundaryY = this.wrapperHeight - 8;
			} else {
				this.minBoundaryY = 0;
				this.maxBoundaryY = this.maxPosY;
			}
		*/
		var x = this.options.listenX && Math.round(this.sizeRatioX * this.scroller.x) || 0,
			y = this.options.listenY && Math.round(this.sizeRatioY * this.scroller.y) || 0;
            //t=滚动条路程/滚动条速度=元素路程/元素速度=>元素路程/滚动条路程=元素速度/滚动条速度=>滚动条应该移动的路程/元素应该移动的路程=滚动条速度/元素速度=>也等于变化量的比值!!!
           //根据这个公式：sizeRatioY表示（滚动条速度/元素的速度）的比值，而滚动条移动的距离=sizeRatioY*元素应该移动的距离，而元素移动的距离就是this.scroller.y,因为this.scroller就是表示iScroll
		   //因此x,y就是表示iScroll对象当前所在的位置!
		if ( !this.options.ignoreBoundaries ) {
			//如果滚动在左边太小
			if ( x < this.minBoundaryX ) {
				if ( this.options.shrink == 'scale' ) {
					this.width = Math.max(this.indicatorWidth + x, 8);
					this.indicatorStyle.width = this.width + 'px';
				}
				x = this.minBoundaryX;
				//如果滚动到右边太多
			} else if ( x > this.maxBoundaryX ) {
			 //this.maxBoundaryX = this.wrapperWidth - 8;
			 //等于包裹元素的宽度减去8个像素
				if ( this.options.shrink == 'scale' ) {
					this.width = Math.max(this.indicatorWidth - (x - this.maxPosX), 8);
					this.indicatorStyle.width = this.width + 'px';
					x = this.maxPosX + this.indicatorWidth - this.width;
				} else {
					x = this.maxBoundaryX;
				}
				//其他情况
			} else if ( this.options.shrink == 'scale' && this.width != this.indicatorWidth ) {
				this.width = this.indicatorWidth;
				this.indicatorStyle.width = this.width + 'px';
			}
            //元素如果y方向太小，如垂直方向已经滚动到内部了
			if ( y < this.minBoundaryY ) {
				if ( this.options.shrink == 'scale' ) {
					this.height = Math.max(this.indicatorHeight + y * 3, 8);
					//滚动条高度+3*y，至少也是8px的高度
					this.indicatorStyle.height = this.height + 'px';
				}
				//不让元素滚动进去太多，最多也就是this.minBoundaryY
				y = this.minBoundaryY;
			} else if ( y > this.maxBoundaryY ) {
				//如果在y方向向下滚动太多
				if ( this.options.shrink == 'scale' ) {
					//最小也是8px高度
					this.height = Math.max(this.indicatorHeight - (y - this.maxPosY) * 3, 8);
					this.indicatorStyle.height = this.height + 'px';
					//滚动槽和滚动条的差值+滚动条的高度-至少8px的高度像素
					y = this.maxPosY + this.indicatorHeight - this.height;
				} else {
					//如果不是scale，那么保持y为this.maxBoundaryY
					y = this.maxBoundaryY;
				}
			} else if ( this.options.shrink == 'scale' && this.height != this.indicatorHeight ) {
				this.height = this.indicatorHeight;
				this.indicatorStyle.height = this.height + 'px';
			}
		}

		this.x = x;
		this.y = y;
        //看看有没有给滚动槽设置使用transform，如果设置了那么我们的滚动条就使用transform动画，否则使用left/top动画就可以了 
		if ( this.scroller.options.useTransform ) {
			this.indicatorStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.scroller.translateZ;
		} else {
			this.indicatorStyle.left = x + 'px';
			this.indicatorStyle.top = y + 'px';
		}
	},

  //调用方式：this._pos(newX, newY);
  //作用：将滚动条滚动到指定的位置
	_pos: function (x, y) {
		if ( x < 0 ) {
			x = 0;
			//滚动条向左移动最小是0
		} else if ( x > this.maxPosX ) {
			//滚动条向右移动最多是滚动槽的长度-滚动条的长度
			//this.maxPosX = this.wrapperWidth - this.indicatorWidth;
			x = this.maxPosX;
		}
        //滚动条垂直方向是最小是0，最大是滚动槽减去滚动条
		if ( y < 0 ) {
			y = 0;
		} else if ( y > this.maxPosY ) {
			y = this.maxPosY;
		}
        //t=滚动条路程/滚动条速度=元素路程/元素速度=>元素路程/滚动条路程=元素速度/滚动条速度=>滚动条应该移动的路程/元素应该移动的路程=滚动条速度/元素速度=>也等于变化量的比值!!!
           //根据这个公式：sizeRatioY表示（滚动条速度/元素的速度）的比值，而滚动条移动的距离=sizeRatioY*元素应该移动的距离，而元素移动的距离就是this.scroller.y,因为this.scroller就是表示iScroll
		   //因此x,y就是表示iScroll对象当前所在的位置!
		x = this.options.listenX ? Math.round(x / this.sizeRatioX) : this.scroller.x;
		y = this.options.listenY ? Math.round(y / this.sizeRatioY) : this.scroller.y;
        //如果监听Y轴的滚动，那么就从滚动条应该运行的距离来计算元素移动的距离，也就是scroller应该移动的距离
        //如果Y轴不需要移动，表示Y轴没有滚动条，这时候Y轴的方向，也就是scroller元素的位置就是scroller的高度，坐标就是scroller的y值
		this.scroller.scrollTo(x, y);
	},

   //调用方式：this.fade(1, true);
	fade: function (val, hold) {
		//如果hold为true同时当前元素是不可见的，那么不会调用fade放啊
		if ( hold && !this.visible ) {
			return;
		}

		clearTimeout(this.fadeTimeout);
		this.fadeTimeout = null;
		var time = val ? 250 : 500,
			delay = val ? 0 : 300;
			//如果没有传递val

		val = val ? '1' : '0';

		this.wrapperStyle[utils.style.transitionDuration] = time + 'ms';

		this.fadeTimeout = setTimeout((function (val) {
			this.wrapperStyle.opacity = val;
			this.visible = +val;
		}).bind(this, val), delay);
	}
};

IScroll.utils = utils;

if ( typeof module != 'undefined' && module.exports ) {
	module.exports = IScroll;
} else if ( typeof define == 'function' && define.amd ) {
        define( function () { return IScroll; } );
} else {
	window.IScroll = IScroll;
}

})(window, document, Math);
