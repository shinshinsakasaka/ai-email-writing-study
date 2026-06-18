/*************************************************************
 * Email Writing Study
 * Investigates cultural differences in AI-assisted email writing.
 *
 * Conditions:
 *   A — Task 2: low-context AI,  Task 3: high-context AI
 *   B — Task 2: high-context AI, Task 3: low-context AI
 *************************************************************/

window.LITW = window.LITW || {};

window.$ = require("jquery");
window.jQuery = window.$;
require("../js/jquery.i18n");
require("../js/jquery.i18n.messagestore");
require("jquery-ui-bundle");

let Handlebars = require("handlebars");
window.$.alpaca = require("alpaca");
window.bootstrap = require("bootstrap");
window._ = require("lodash");

import * as litw_engine from "../js/litw/litw.engine.0.1.0";
LITW.engine = litw_engine;

// Load templates
import progressHTML     from "./templates/progress.html";
import introHTML        from "./templates/introduction.html";
import irbHTML          from "./templates/irb2-litw.html";
import task1HTML        from "./templates/task1.html";
import task2HTML        from "./templates/task2.html";
import task3HTML        from "./templates/task3.html";
import draftPrefHTML    from "./templates/draft-preference.html";
import demographicsHTML from "./templates/demographics.html";
import commentsHTML     from "./templates/comments.html";
import resultsHTML      from "./templates/results.html";
import resultsFooterHTML from "./templates/results-footer.html";

Handlebars.registerPartial('prog', Handlebars.compile(progressHTML));

const introTemplate        = Handlebars.compile(introHTML);
const irbTemplate          = Handlebars.compile(irbHTML);
const task1Template        = Handlebars.compile(task1HTML);
const task2Template        = Handlebars.compile(task2HTML);
const task3Template        = Handlebars.compile(task3HTML);
const draftPrefTemplate    = Handlebars.compile(draftPrefHTML);
const demographicsTemplate = Handlebars.compile(demographicsHTML);
const commentsTemplate     = Handlebars.compile(commentsHTML);
const resultsTemplate      = Handlebars.compile(resultsHTML);
const resultsFooterTemplate = Handlebars.compile(resultsFooterHTML);

module.exports = (function(exports) {

  // Counterbalancing: Latin square group (scenario rotation) + AI condition order
  const latinGroup = ['A', 'B', 'C'][Math.floor(Math.random() * 3)];
  const condition   = Math.random() < 0.5 ? 'A' : 'B';

  // One fixed scenario per type
  const favorKey    = '1c';
  const disagreeKey = '2a';
  const refusalKey  = '3a';

  // Assign scenario to each task based on Latin square group
  const GROUP_SCENARIOS = {
    'A': [favorKey,    disagreeKey, refusalKey],
    'B': [disagreeKey, refusalKey,  favorKey],
    'C': [refusalKey,  favorKey,    disagreeKey],
  };
  const [scenario1, scenario2, scenario3] = GROUP_SCENARIOS[latinGroup];

  // Stores Task 1 email for end-of-study feedback scoring
  let task1Email = { subject: '', body: '' };

  function scoreEmail(subject, body, lang) {
    const isJa = lang && lang.startsWith('ja');
    const text = isJa ? (subject + ' ' + body) : (subject + ' ' + body).toLowerCase();

    const keywords = {
      en: {
        indirectness: [
          'maybe', 'perhaps', 'i think', 'i believe', 'i feel that',
          'it seems', 'i wonder', 'possibly', 'might', 'could be',
          'it may', 'i suppose', 'i guess', 'i was wondering',
          "i'm not sure", 'somewhat', 'kind of', 'sort of',
          'it appears', 'you might', 'you may want'
        ],
        imposition: [
          'sorry', 'apologize', "i'm afraid", 'if possible',
          'if convenient', 'when you have time', 'at your convenience',
          "if you don't mind", 'could you', 'would you',
          'would it be possible', 'would you mind', 'is it possible',
          'i was hoping', 'i appreciate', 'thank you for',
          'grateful', "i know you're busy", 'i understand this',
          'sorry for', 'excuse me', 'i hope this'
        ]
      },
      ja: {
        indirectness: [
          'かもしれません', 'かもしれない', 'と思います', 'と思いまして',
          'のような気がします', 'でしょうか', 'いかがでしょうか',
          'ではないかと', 'かと思いまして', 'かと存じます',
          'おそらく', 'たぶん', 'もしかすると', 'ようでしたら',
          '思われます', 'かもしれません', 'かなと'
        ],
        imposition: [
          '申し訳ございません', '申し訳ありません', '恐れ入ります',
          '恐縮です', 'お忙しいところ', 'ご迷惑をおかけして',
          '突然のご連絡', 'お手数をおかけして', 'お手数ですが',
          'もし可能でございましたら', 'もし可能であれば', 'よろしければ',
          'もしよろしければ', 'していただけますでしょうか',
          'していただけますか', 'いただければ幸いです',
          'いただければと存じます', '感謝申し上げます',
          'ありがとうございます', 'ありがたく存じます',
          '大変感謝', '感謝いたします', 'ご理解いただけますと',
          'ご検討いただけますと', 'お願い申し上げます'
        ]
      }
    };

    const kw = isJa ? keywords.ja : keywords.en;
    let indirectCount = 0;
    let impositionCount = 0;
    kw.indirectness.forEach(k => { if (text.includes(k)) indirectCount++; });
    kw.imposition.forEach(k => { if (text.includes(k)) impositionCount++; });

    function countToScore(n) {
      if (n === 0) return 1;
      if (n <= 2) return 2;
      if (n <= 4) return 3;
      if (n <= 6) return 4;
      return 5;
    }

    const indirectness = countToScore(indirectCount);
    const imposition = countToScore(impositionCount);
    const avg = (indirectness + imposition) / 2;
    const profile = avg <= 2 ? 'low' : avg < 4 ? 'balanced' : 'high';

    return {
      indirectness,
      imposition,
      indirectnessPct: indirectness * 20,
      impositionPct: imposition * 20,
      profile
    };
  }
  // A: task2=low-context, task3=high-context
  // B: task2=high-context, task3=low-context

  const task2Context = condition === 'A' ? 'low-context' : 'high-context';
  const task3Context = condition === 'A' ? 'high-context' : 'low-context';

  // Pre-generated AI drafts keyed by scenario then context type
  const drafts = {
    '1a': {
      'low-context': {
        subject: "Request for Two-Day Extension on Friday Report",
        body:
`Hi [Boss's Name],

I'm writing to request a two-day extension on the report due this Friday.

Yesterday, I identified a significant error in the data analysis that requires me to redo a substantial portion of the work. I estimate this will take an additional two days to complete properly. Submitting the report on Friday without addressing this error would mean the findings are incomplete and potentially inaccurate.

I'd like to propose a new deadline of Sunday evening or Monday morning. I'm confident I can deliver a thorough and accurate report by then.

Please let me know if this works for you, or if you'd like to discuss alternatives.

Thank you,
[Your Name]`
      },
      'high-context': {
        subject: "Regarding the Report Submission This Friday",
        body:
`Dear [Boss's Name],

I hope you are doing well. I wanted to reach out regarding the report scheduled for this Friday.

As I have been working to ensure the report meets the standards expected of our team, I came across some concerns in the data analysis yesterday that I feel warrant careful attention before submission. I want to make sure the final product accurately reflects our team's diligence and thoroughness.

Given the situation, I was wondering whether there might be any flexibility around the submission timeline — even a couple of additional days would allow me to address these matters properly and present work that we can all feel proud of.

I deeply appreciate your understanding and guidance on how best to proceed. Please let me know what you think.

Warm regards,
[Your Name]`
      }
    },
    '1b': { 'low-context': { subject: '[Draft coming soon]', body: '[AI draft for scenario 1-B low-context]' }, 'high-context': { subject: '[Draft coming soon]', body: '[AI draft for scenario 1-B high-context]' } },
    '1c': {
      'low-context': {
        subject: "Request for Leave This Week",
        body:
`Hi [Supervisor's Name],

I hope this email finds you well. I am writing to request three days of leave from Wednesday, November 8th, through Friday, November 10th.

A very close friend is getting married this Saturday, and I was only recently asked to be a part of the wedding party. This requires me to travel out of town early to participate in necessary preparations.

I understand this is incredibly short notice and goes against your usual policy for last-minute requests, which I fully respect. However, missing this significant event for a close friend is truly not an option for me.

I am already proactively preparing for my absence by completing urgent tasks and ensuring comprehensive handovers for all critical responsibilities. I am committed to minimizing any disruption.

Thank you for considering my urgent request.

Sincerely,
[Your Name]`
      },
      'high-context': {
        subject: "Request for Leave This Week",
        body:
`Hi [Supervisor's Name],

I apologize for contacting you while you are away. I sincerely apologize for this sudden message, but I am writing to request three days of leave from this Thursday evening through Sunday.

A long-time close friend's wedding is this Saturday, and last week I was suddenly asked to attend as a member of the wedding party. This has resulted in a very last-minute request, and I am deeply sorry.

I am fully aware that this last-minute leave request goes against your policy, and I am truly sorry. However, I humbly ask for your permission so that I may fulfill this important role in celebrating my close friend's new chapter.

To ensure there is no disruption to work during my absence, I will complete my projects as much as possible in advance, ask my colleague [Name] to handle urgent matters, and ensure a thorough handover.

I apologize for this selfish request, but I sincerely hope you will approve it.

Respectfully,
[Your Name]`
      }
    },
    '2a': {
      'low-context': {
        subject: "Concern About Switching Data Collection Methods",
        body:
`Hi [Supervisor's Name],

Thanks for asking to be contacted by email while you're away. After today's meeting I wanted to flag a concern about switching data-collection methods mid-project. Based on our experience in the first phase, changing methods now will introduce inconsistencies between datasets and impede comparability, increasing the likelihood that our final analysis will be unreliable and may not withstand stakeholder scrutiny.

I recommend either maintaining the current method through completion or running a small parallel pilot of the new method while documenting differences for analysis adjustments. I can prepare a brief impact assessment and proposed options for your review. Would you like me to proceed?

Best regards,
[Your Name]`
      },
      'high-context': {
        subject: "Concern About Switching Data Collection Methods",
        body:
`Hi [Supervisor's Name],

Thank you for your hard work.

I am writing to share a concern regarding the change to the data collection method explained in today's meeting.

A change midway through the project may make it difficult to maintain consistency with existing data. As a result, I feel there is a risk that the reliability of the final analysis will decrease, and that the validity of the results may be questioned when reporting to the client.

I apologize for the inconvenience during your busy schedule, but would it be possible to reconsider the timing and procedure of the change?

Thank you very much.

[Your Name]`
      }
    },
    '2b': { 'low-context': { subject: '[Draft coming soon]', body: '[AI draft for scenario 2-B low-context]' }, 'high-context': { subject: '[Draft coming soon]', body: '[AI draft for scenario 2-B high-context]' } },
    '2c': { 'low-context': { subject: '[Draft coming soon]', body: '[AI draft for scenario 2-C low-context]' }, 'high-context': { subject: '[Draft coming soon]', body: '[AI draft for scenario 2-C high-context]' } },
    '3a': {
      'low-context': {
        subject: "Regarding the New Client Proposal",
        body:
`Hi [Supervisor's Name],

Per your request to communicate by email while you're away: thank you for considering me to lead the new client proposal. I'm currently managing two projects with critical deadlines within the next ten days; taking on the proposal would require about 15 additional hours and would force substantial quality trade-offs or missed deliverables on those projects. Given that, I can't accept the proposal assignment at this time without risking our commitments.

I can, however, help by outlining the proposal framework, mentoring a colleague to lead it, or starting a first draft for handoff. Please let me know which alternative you prefer or if you'd like to revisit this after next week.

Best regards,
[Your Name]`
      },
      'high-context': {
        subject: "Regarding the New Client Proposal",
        body:
`Hi [Supervisor's Name],

Thank you for your hard work.

I have received your request regarding the new client proposal. I would very much like to help, but I currently have two projects on hand, both with important deadlines within the next ten days.

I estimate that approximately 15 additional hours will be needed for this proposal, and it would be difficult to maintain the quality and meet the deadlines of my existing work.

I sincerely apologize, but I find it difficult to take this on at this time. Would you consider asking someone else? I am happy to assist with anything I can.

Thank you very much.
[Your Name]`
      }
    },
    '3b': { 'low-context': { subject: '[Draft coming soon]', body: '[AI draft for scenario 3-B low-context]' }, 'high-context': { subject: '[Draft coming soon]', body: '[AI draft for scenario 3-B high-context]' } },
    '3c': { 'low-context': { subject: '[Draft coming soon]', body: '[AI draft for scenario 3-C low-context]' }, 'high-context': { subject: '[Draft coming soon]', body: '[AI draft for scenario 3-C high-context]' } },
  };

  const drafts_ja = {
    '1a': {
      'low-context': {
        subject: "レポート提出期限の2日間延長のお願い",
        body:
`○○様

お疲れ様です。今週金曜日が締め切りのレポートについて、2日間の延長をお願いしたくご連絡しました。

昨日、データ分析に重大な誤りを発見し、作業のかなりの部分をやり直す必要があることがわかりました。修正には2日ほどかかる見込みです。このまま金曜日に提出した場合、レポートの内容が不完全かつ不正確なものになってしまいます。

新しい締め切りとして、日曜日の夜または月曜日の朝を提案させていただきます。それまでには、正確で完成度の高いレポートをお届けできる自信があります。

ご都合をお聞かせいただけますと幸いです。よろしくお願いいたします。

[氏名]`
      },
      'high-context': {
        subject: "レポートの提出期限につきまして",
        body:
`○○様

お世話になっております。今週金曜日に提出予定のレポートについて、ご相談があり連絡いたしました。

チームの期待に応えるべく作業を進めておりましたところ、昨日データ分析の内容に気になる点が見つかりました。提出前に丁寧に確認しておくべき事項かと思い、最終的に皆さんに誇りを持っていただけるものをお渡しできればと考えております。

もし提出のスケジュールについて、多少の余裕を持たせていただくことが可能でしょうか。数日あれば、しっかりと対応できるかと思います。

ご理解とご指示をいただけますと大変ありがたく存じます。どうぞよろしくお願い申し上げます。

[氏名]`
      }
    },
    '1b': { 'low-context': { subject: '[下書き準備中]', body: '[シナリオ1-B 低コンテキスト]' }, 'high-context': { subject: '[下書き準備中]', body: '[シナリオ1-B 高コンテキスト]' } },
    '1c': {
      'low-context': {
        subject: "今週の休暇申請について",
        body:
`[上司の名前]様

お世話になっております。11月8日（水）から11月10日（金）の3日間、休暇をいただきたくご連絡いたしました。

今週の土曜日に非常に親しい友人の結婚式があり、つい最近になって結婚式のメンバーとして参加するよう依頼されました。そのため、結婚式の準備への参加のために早めに遠方へ移動する必要がございます。

これが非常に直前のご連絡であり、また直前申請に関する通常のポリシーにも反することは理解しております。しかしながら、親しい友人の結婚式を欠席することは、どうしてもできません。

すでに緊急であるタスクの完了と重要な業務すべてについての完全な引き継ぎを行なっており、不在に向けた準備を積極的に進めております。業務への支障を最小限に抑えることをお約束いたします。

急なお願いをご検討いただき、ありがとうございます。

[あなたの名前]`
      },
      'high-context': {
        subject: "今週の休暇申請について",
        body:
`[上司の名前]様

ご不在のところ恐縮です。突然のご連絡で大変申し訳ございませんが、今週木曜日の夜から日曜までの3日間、休暇をいただきたくお願い申し上げます。

今週土曜日に長年の親友の結婚式があり、先週になり急遽、結婚式のメンバーとして出席することになりました。このため、大変直前のご依頼となってしまいました。

直前の休暇申請は貴殿の方針に反すると重々承知しており、誠に恐縮でございます。しかし、親友の門出を祝う大切な役目を果たすため、何卒お許しいただきたく存じます。

不在中の業務に支障が出ないよう、案件は可能な限り前倒しで完了させ、緊急時の対応は同僚の〇〇さんに依頼し、万全の引継ぎを行います。

身勝手なお願いで恐縮ですが、何卒ご承認いただけますよう、お願い申し上げます。

敬具

[あなたの名前]`
      }
    },
    '2a': {
      'low-context': {
        subject: "データ収集方法の変更について",
        body:
`[上司の名前]様

メールにてご連絡するようご指示いただきありがとうございます。本日の会議でのデータ収集方法の変更について、一点懸念がございます。第一フェーズでの経験を踏まえますと、現時点でのデータ収集方法の変更はデータ間に不整合をもたらし、一貫した比較が難しくなります。その結果、最終分析の信頼性が低下し、ステークホルダーへの報告時に結果の妥当性を問われる可能性が高まります。

現行の方法で最後まで行うか、新しい方法を小規模で並行して試しながら分析調整のために差異を記録するか、いずれかをお勧めします。また、いかがでしょうか。

よろしくお願いいたします。
[あなたの名前]`
      },
      'high-context': {
        subject: "データ収集方法の変更について",
        body:
`[上司の名前]様

お疲れ様です。

本日のミーティングでご説明いただいたデータ収集方法の変更について、一点懸念をお伝えしたく連絡いたしました。

プロジェクト途中での変更により、既存データとの間に一貫性が生じにくくなる可能性があります。その結果、最終分析の信頼性が低下し、取引先への報告時に結果の妥当性を問われるリスクがあると感じております。

ご多忙の折、恐縮ではございますが、変更の時期や手順について改めてご検討いただけますでしょうか。

何卒よろしくお願いいたします。

[あなたの名前]`
      }
    },
    '2b': { 'low-context': { subject: '[下書き準備中]', body: '[シナリオ2-B 低コンテキスト]' }, 'high-context': { subject: '[下書き準備中]', body: '[シナリオ2-B 高コンテキスト]' } },
    '2c': { 'low-context': { subject: '[下書き準備中]', body: '[シナリオ2-C 低コンテキスト]' }, 'high-context': { subject: '[下書き準備中]', body: '[シナリオ2-C 高コンテキスト]' } },
    '3a': {
      'low-context': {
        subject: "新規クライアント提案のご依頼について",
        body:
`[上司の名前]様

ご依頼の通りメールにてご連絡いたします。新規クライアント提案の代表としてご検討いただき、ありがとうございます。現在、今後10日以内に重要な締め切りを抱えるプロジェクトを2件担当しております。この提案を引き受けることになると、追加でだいたい15時間が必要となり、それらのプロジェクトで大幅な品質の低下または成果物完成までの遅延が生じます。そのため、現状では既存業務への支障なく提案を引き受けることはできません。

ただし、提案のフレームワーク作成、同僚が担当できるよう指導、または引き継ぎのための初稿作成といった形でお手伝いできます。どの代替案をご希望か、あるいは来週以降に再検討をご希望かをお知らせください。

よろしくお願いいたします。
[あなたの名前]`
      },
      'high-context': {
        subject: "新規クライアント提案のご依頼について",
        body:
`[上司の名前]様

お疲れ様です。

新規クライアント向け提案書のご依頼、承りました。ぜひお力になりたいのですが、現在2つのプロジェクトを抱えており、どちらも今後10日以内に重要な締め切りが迫っております。

今回の提案書には追加で約15時間が必要と見込まれ、既存業務の品質と締め切りを守ることが難しい状況です。

誠に恐れ入りますが、今回はお引き受けが難しい状況です。他の方へのご依頼をご検討いただけますでしょうか。何かできることがあれば、喜んで対応いたします。

よろしくお願いいたします。
[あなたの名前]`
      }
    },
    '3b': { 'low-context': { subject: '[下書き準備中]', body: '[シナリオ3-B 低コンテキスト]' }, 'high-context': { subject: '[下書き準備中]', body: '[シナリオ3-B 高コンテキスト]' } },
    '3c': { 'low-context': { subject: '[下書き準備中]', body: '[シナリオ3-C 低コンテキスト]' }, 'high-context': { subject: '[下書き準備中]', body: '[シナリオ3-C 高コンテキスト]' } },
  };

  // Expose generateDraft globally so templates can call it
  window.generateDraft = function(taskId, contextType) {
    const lang = $.i18n().locale || 'en';
    const draftSet = lang.startsWith('ja') ? drafts_ja : drafts;
    const scenarioKey = taskId === 'task2' ? scenario2 : scenario3;
    const draft = (draftSet[scenarioKey] || {})[contextType];
    if (!draft) return;

    const btn = document.getElementById('btn-generate-' + taskId);
    btn.disabled = true;
    btn.querySelector('span').textContent = $.i18n('study-generating');

    setTimeout(function() {
      document.getElementById(taskId + '-subject').value = draft.subject;
      document.getElementById(taskId + '-body').value = draft.body;
      btn.querySelector('span').textContent = $.i18n('study-generated');
      btn.style.background = '#2a9d5c';
    }, 900);
  };

  // Confirmation modal shown when participant clicks Send
  window.showSendConfirm = function() {
    if (!document.getElementById('sendConfirmModal')) {
      $('body').append(`
        <div class="modal fade" id="sendConfirmModal" tabindex="-1" aria-modal="true">
          <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content">
              <div class="modal-body text-center py-4 px-4">
                <p class="fw-bold mb-4" id="sendConfirmText"></p>
                <button class="btn btn-outline-secondary me-2" data-bs-dismiss="modal" id="sendConfirmCancel"></button>
                <button class="btn btn-success" id="sendConfirmOk"></button>
              </div>
            </div>
          </div>
        </div>
      `);
    }
    document.getElementById('sendConfirmText').textContent    = $.i18n('study-send-confirm-text');
    document.getElementById('sendConfirmCancel').textContent  = $.i18n('study-send-confirm-cancel');
    document.getElementById('sendConfirmOk').textContent      = $.i18n('study-send-confirm-ok');
    const modal = new window.bootstrap.Modal(document.getElementById('sendConfirmModal'));
    modal.show();
    $('#sendConfirmOk').off('click').on('click', function() {
      modal.hide();
      $('#btn-next-page').click();
    });
  };

  let timeline = [];

  const config = {
    languages: {
      'default': 'en',
      'en': './i18n/en.json?v=1.4',
      'ja': './i18n/ja.json?v=1.4',
    },
    study_id: "email-writing-study-v1",
    study_recommendation: [],
    preLoad: ["../img/btn-next.png", "../img/btn-next-active.png", "../img/ajax-loader.gif"],
    slides: {

      INTRODUCTION: {
        name: "introduction",
        type: LITW.engine.SLIDE_TYPE.SHOW_SLIDE,
        display_element_id: "intro",
        template: introTemplate,
        display_next_button: false,
      },

      INFORMED_CONSENT: {
        name: "informed_consent",
        type: LITW.engine.SLIDE_TYPE.SHOW_SLIDE,
        display_element_id: "irb",
        template: irbTemplate,
        template_data: { time: 20 },
        display_next_button: false,
      },


      TASK1: {
        name: "task1",
        type: LITW.engine.SLIDE_TYPE.SHOW_SLIDE,
        display_element_id: "task1",
        template: task1Template,
        template_data: { scenarioKey: scenario1 },
        display_next_button: false,
        finish: function() {
          task1Email.subject = $('#task1-subject').val();
          task1Email.body    = $('#task1-body').val();
          LITW.data.submitStudyData({
            slide: 'task1',
            scenario: scenario1,
            latin_group: latinGroup,
            condition: condition,
            email_subject: task1Email.subject,
            email_body: task1Email.body,
            timestamp: Date.now()
          });
        }
      },

      TASK2: {
        name: "task2",
        type: LITW.engine.SLIDE_TYPE.SHOW_SLIDE,
        display_element_id: "task2",
        template: task2Template,
        template_data: { contextType: task2Context, scenarioKey: scenario2 },
        display_next_button: false,
        finish: function() {
          const btn = document.getElementById('btn-generate-task2');
          LITW.data.submitStudyData({
            slide: 'task2',
            scenario: scenario2,
            latin_group: latinGroup,
            condition: condition,
            context_type: task2Context,
            email_subject: $('#task2-subject').val(),
            email_body: $('#task2-body').val(),
            draft_generated: btn ? btn.disabled : false,
            timestamp: Date.now()
          });
        }
      },

      TASK3: {
        name: "task3",
        type: LITW.engine.SLIDE_TYPE.SHOW_SLIDE,
        display_element_id: "task3",
        template: task3Template,
        template_data: { contextType: task3Context, scenarioKey: scenario3 },
        display_next_button: false,
        finish: function() {
          const btn = document.getElementById('btn-generate-task3');
          LITW.data.submitStudyData({
            slide: 'task3',
            scenario: scenario3,
            latin_group: latinGroup,
            condition: condition,
            context_type: task3Context,
            email_subject: $('#task3-subject').val(),
            email_body: $('#task3-body').val(),
            draft_generated: btn ? btn.disabled : false,
            timestamp: Date.now()
          });
        }
      },

      DRAFT_PREFERENCE: {
        name: "draft_preference",
        type: LITW.engine.SLIDE_TYPE.SHOW_SLIDE,
        display_element_id: "draft-preference",
        template: draftPrefTemplate,
        display_next_button: true,
        finish: function() {
          const pref = $('input[name="draft-pref"]:checked').val();
          LITW.data.submitStudyData({
            slide: 'draft_preference',
            preferred_draft: pref || 'no_response',
            condition: condition,
            task2_context: task2Context,
            task3_context: task3Context,
            timestamp: Date.now()
          });
        }
      },

      DEMOGRAPHICS: {
        name: "demographics",
        type: LITW.engine.SLIDE_TYPE.SHOW_SLIDE,
        display_element_id: "demographics",
        template: demographicsTemplate,
        template_data: { local_data_id: 'LITW_DEMOGRAPHICS' },
        display_next_button: false,
        finish: function() {
          let dem_data = $('#demographicsForm').alpaca().getValue();
          LITW.data.addToLocal(this.template_data.local_data_id, dem_data);
          LITW.data.submitDemographics(dem_data);
        }
      },

      COMMENTS: {
        name: "comments",
        type: LITW.engine.SLIDE_TYPE.SHOW_SLIDE,
        display_element_id: "comments",
        template: commentsTemplate,
        display_next_button: true,
        finish: function() {
          let comments = $('#commentsForm').alpaca().getValue();
          if (Object.keys(comments).length > 0) {
            LITW.data.submitComments({ comments: comments });
          }
        }
      },

      RESULTS: {
        display_next_button: false,
        type: LITW.engine.SLIDE_TYPE.CALL_FUNCTION,
        setup: function() { showResults(); }
      }
    }
  };

  function configureTimeline() {
    timeline.push(config.slides.INTRODUCTION);
    timeline.push(config.slides.INFORMED_CONSENT);
    timeline.push(config.slides.TASK1);
    timeline.push(config.slides.TASK2);
    timeline.push(config.slides.TASK3);
    timeline.push(config.slides.DRAFT_PREFERENCE);
    timeline.push(config.slides.DEMOGRAPHICS);
    timeline.push(config.slides.COMMENTS);
    timeline.push(config.slides.RESULTS);
    return timeline;
  }

  function showResults() {
    let results = {};
    if ('PID' in LITW.data.getURLparams) {
      results.code = LITW.data.getParticipantId();
    }

    const lang = $.i18n().locale || 'en';
    const scores = scoreEmail(task1Email.subject, task1Email.body, lang);
    results.feedback = {
      profileTitle:    $.i18n('study-results-profile-' + scores.profile + '-title'),
      profileDesc:     $.i18n('study-results-profile-' + scores.profile + '-desc'),
      culturalContext: $.i18n('study-results-cultural-' + scores.profile),
      indirectness:    scores.indirectness,
      imposition:      scores.imposition,
      indirectnessPct: scores.indirectnessPct,
      impositionPct:   scores.impositionPct,
    };
    LITW.data.submitStudyData({
      slide: 'feedback_scores',
      indirectness: scores.indirectness,
      imposition:   scores.imposition,
      profile:      scores.profile,
      timestamp:    Date.now()
    });

    let results_div = $("#results");
    results_div.html(resultsTemplate({ data: results }));
    $("#results-footer").html(resultsFooterTemplate({
      share_url: window.location.href,
      share_title: $.i18n('study-title'),
      share_text: $.i18n('study-title'),
      more_litw_studies: config.study_recommendation
    }));
    results_div.i18n();
    LITW.utils.showSlide("results");
  }

  function bootstrap() {
    let good_config = LITW.engine.configure_study(
      config.preLoad,
      config.languages,
      configureTimeline()
    );
    if (good_config) {
      LITW.engine.start_study();
    } else {
      console.error("Study configuration error!");
    }
  }

  $(document).ready(function() {
    bootstrap();
  });

  exports.study = {};
  exports.study.params = config;

})(window.LITW = window.LITW || {});
