import { useEffect, type CSSProperties } from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  Gamepad2,
  Heart,
  Medal,
  MessageCircleQuestion,
  Play,
  ShieldCheck,
  Sparkles,
  Telescope,
} from 'lucide-react';
import './PromoPage.css';

interface PromoPageProps {
  onExplore: () => void;
  onTrial: () => void;
}

const steps = [
  { icon: BrainCircuit, title: '核心知识', text: '用孩子熟悉的生活场景，先把新概念讲明白。', tone: 'blue' },
  { icon: Play, title: '绘本故事', text: '跟着团团和点点进入故事，在情节里理解 AI。', tone: 'purple' },
  { icon: MessageCircleQuestion, title: '知识问答', text: '每学一点就练一点，及时发现还没弄懂的地方。', tone: 'orange' },
  { icon: Gamepad2, title: '互动游戏', text: '把抽象原理变成能点击、能尝试、能反馈的体验。', tone: 'green' },
  { icon: Telescope, title: '动手实践', text: '把知识带回真实生活，完成属于自己的小挑战。', tone: 'coral' },
  { icon: Medal, title: '总结成长', text: '记录进度与勋章，让每一次进步都清晰可见。', tone: 'gold' },
];

const chapters = [
  { no: '01', title: '认识信息与计算', text: '从线索、编码到图像，让计算机看懂世界', color: '#4b9fea' },
  { no: '02', title: '学会算法与数据', text: '学习步骤、分类与预测，建立计算思维', color: '#8b6ee8' },
  { no: '03', title: '探索机器学习', text: '理解机器如何学习、识别语言和发现规律', color: '#46b98b' },
  { no: '04', title: '创造负责任的 AI', text: '体验生成式 AI，学习安全、伦理与协作', color: '#f18a55' },
];

const covers = [1, 9, 17, 25].map((lesson) => ({
  lesson,
  src: `assets/covers/covers/AI启蒙绘本_第${String(lesson).padStart(2, '0')}课_封面海报_3x4.jpeg`,
}));

export default function PromoPage({ onExplore, onTrial }: PromoPageProps) {
  useEffect(() => {
    document.body.classList.add('promo-mode');
    return () => document.body.classList.remove('promo-mode');
  }, []);

  return (
    <div className="promo-page">
      <header className="promo-nav" aria-label="宣传页导航">
        <a className="promo-brand" href="#promo-top" aria-label="AI启蒙绘本首页">
          <span className="promo-brand-mark"><Sparkles size={20} /></span>
          <span>AI启蒙绘本</span>
        </a>
        <nav className="promo-nav-links" aria-label="页面章节">
          <a href="#how">学习方式</a>
          <a href="#course">课程体系</a>
          <a href="#parents">家长安心</a>
        </nav>
        <button className="promo-nav-cta" onClick={onExplore}>进入课程 <ArrowRight size={17} /></button>
      </header>

      <main>
        <section className="promo-hero" id="promo-top">
          <div className="promo-orb promo-orb-one" />
          <div className="promo-orb promo-orb-two" />
          <div className="promo-hero-copy">
            <div className="promo-eyebrow"><span>专为孩子设计</span> · 32 节 AI 系统启蒙课</div>
            <h1>把难懂的 AI，<br /><em>讲成孩子听得懂的故事</em></h1>
            <p>和团团、点点一起，从身边的线索出发，在绘本、问答和游戏里认识人工智能，建立面向未来的思考力与创造力。</p>
            <div className="promo-actions">
              <button className="promo-primary" onClick={onTrial}><Play size={19} fill="currentColor" /> 免费体验第一课</button>
              <a className="promo-secondary" href="#course">看看学什么 <ChevronRight size={18} /></a>
            </div>
            <div className="promo-trust">
              <span><Check size={16} /> 无需注册</span>
              <span><Check size={16} /> 随时开始</span>
              <span><Check size={16} /> 学习进度自动保存</span>
            </div>
          </div>

          <div className="promo-hero-visual" aria-label="团团和点点探索人工智能世界">
            <div className="promo-scene" />
            <img className="promo-character promo-character-kid" src="assets/characters/characters/tuantuan.png" alt="课程主角团团" />
            <img className="promo-character promo-character-bot" src="assets/characters/characters/diandian.png" alt="课程主角点点机器人" />
            <div className="promo-float-card promo-float-card-one"><span>🧩</span><b>边玩边学</b><small>每课专属互动游戏</small></div>
            <div className="promo-float-card promo-float-card-two"><span>✨</span><b>今天又懂了</b><small>一个 AI 小秘密</small></div>
          </div>
        </section>

        <section className="promo-metrics" aria-label="课程数据">
          <div><strong>32</strong><span>节完整课程</span></div><i />
          <div><strong>6</strong><span>步学习闭环</span></div><i />
          <div><strong>320</strong><span>道趣味题目</span></div><i />
          <div><strong>32</strong><span>个互动游戏</span></div>
        </section>

        <section className="promo-section promo-how" id="how">
          <div className="promo-section-heading">
            <span>HOW IT WORKS</span>
            <h2>不是“看完就算”，<br />而是每一课都真正学会</h2>
            <p>六步学习闭环，把理解、练习、反馈和创造串在一起，让孩子始终有事可做、有结果可见。</p>
          </div>
          <div className="promo-step-grid">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article className={`promo-step promo-step-${step.tone}`} key={step.title}>
                  <span className="promo-step-number">0{index + 1}</span>
                  <div className="promo-step-icon"><Icon size={25} /></div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="promo-section promo-course" id="course">
          <div className="promo-course-copy">
            <span className="promo-kicker">一条循序渐进的成长路线</span>
            <h2>从“信息是什么”到<br />“怎样与 AI 一起创造”</h2>
            <p>课程不是零散知识的堆叠。四个阶段由浅入深，从观察世界开始，逐步走向算法、机器学习与负责任的 AI 创造。</p>
            <div className="promo-chapter-list">
              {chapters.map((chapter) => (
                <div className="promo-chapter" key={chapter.no}>
                  <span style={{ background: chapter.color }}>{chapter.no}</span>
                  <div><h3>{chapter.title}</h3><p>{chapter.text}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="promo-cover-stage">
            <div className="promo-cover-label"><BookOpen size={18} /> 32 本原创 AI 绘本</div>
            <div className="promo-covers">
              {covers.map((cover, index) => (
                <img key={cover.lesson} src={cover.src} alt={`第${cover.lesson}课绘本封面`} style={{ '--cover-index': index } as CSSProperties} />
              ))}
            </div>
            <div className="promo-cover-note"><Sparkles size={20} /><span><b>一课一个故事</b><small>孩子愿意看，也愿意继续学</small></span></div>
          </div>
        </section>

        <section className="promo-section promo-parents" id="parents">
          <div className="promo-parent-visual">
            <div className="promo-report-card">
              <div className="promo-report-top"><div><small>本周学习</small><b>稳稳进步中</b></div><span>🔥 4 天</span></div>
              <div className="promo-progress-title"><span>课程总进度</span><b>12 / 32</b></div>
              <div className="promo-progress"><span /></div>
              <div className="promo-report-stats"><div><b>92%</b><small>问答正确率</small></div><div><b>18</b><small>获得勋章</small></div><div><b>7h</b><small>累计学习</small></div></div>
              <div className="promo-mini-award"><Medal size={21} /><span><b>新成就：算法小达人</b><small>已完成第二阶段挑战</small></span></div>
            </div>
          </div>
          <div className="promo-parent-copy">
            <span className="promo-kicker">给孩子自由，也让家长放心</span>
            <h2>成长不只被记录，<br />更能被看见</h2>
            <p>孩子拥有自己的探索空间，家长可以在学习档案中了解进度、答题表现与连续学习情况，陪伴更有方向。</p>
            <ul>
              <li><span><ShieldCheck size={20} /></span><div><b>内容体系完整</b><small>从基础概念到 AI 伦理，知识路径清晰不跳跃</small></div></li>
              <li><span><Heart size={20} /></span><div><b>儿童友好设计</b><small>大字、清晰反馈与温和色彩，孩子能够独立操作</small></div></li>
              <li><span><Medal size={20} /></span><div><b>正向成就激励</b><small>课程进度、连续学习和勋章一起见证每次坚持</small></div></li>
            </ul>
          </div>
        </section>

        <section className="promo-final-cta">
          <img src="assets/characters/characters/diandian03.png" alt="点点机器人邀请你开始课程" />
          <div><span>准备好了吗？</span><h2>和孩子一起，打开 AI 世界的第一扇门</h2><p>从一段好故事开始，让好奇心成为最好的老师。</p></div>
          <button onClick={onTrial}>立即免费体验 <ArrowRight size={19} /></button>
        </section>
      </main>

      <footer className="promo-footer">
        <div className="promo-brand"><span className="promo-brand-mark"><Sparkles size={18} /></span><span>AI启蒙绘本</span></div>
        <p>用故事点亮好奇，用体验理解未来。</p>
        <button onClick={onExplore}>进入完整课程 <ArrowRight size={16} /></button>
      </footer>
    </div>
  );
}
