import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
if (!process.env.CMS_DATABASE_URL) {
  throw new Error("CMS_DATABASE_URL missing.");
}

const faqMediaRoot = "/official-media/siteContent/faq";

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const officialTextToHtml = (value) =>
  String(value || "")
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");

const officialPolicyBodiesEnglish = {
  "terms-and-conditions": `This website is designed, developed and maintained by Omni-Net Technologies Pvt. Ltd. on behalf of UPDESCO & hosted at Uttar Pradesh State Data Centre, Lucknow.

Though all efforts have been made to ensure the accuracy of the content on this website, the same should not be construed as a statement of law or used for any legal purposes. In case of any ambiguity or doubts, users are advised to verify/check with the Department(s) and/or other source(s), and to obtain appropriate professional advice.

Under no circumstances will this Department/UPDESCO/Service Provider be liable for any expense, loss or damage including, without limitation, indirect or consequential loss or damage, or any expense, loss or damage whatsoever arising from use, or loss of use, of data, arising out of or in connection with the use of this website. These terms and conditions shall be governed by and construed in accordance with the Indian Laws. Any dispute arising under these terms and conditions shall be subject to the jurisdiction of the courts of India.

All of the content and Information brought to you by Remote Sensing Applications Centre, U.P., Government of Uttar Pradesh.

Please refer following Policies related Privacy, Copyright and Hyperlinking Policy of this Portal, If you need any more information than please visit following or feel free to contact us.

Privacy Policy
Copyright Policy
Hyperlinking Policy`,
  "copyright-policy": `Material on this site is subject to copyright protection unless otherwise indicated. The material in form of file or printable matter may be downloaded without requiring specific prior permission. Any other proposed use of the material is subject to the approval of Remote Sensing Applications Centre, U.P., Government of Uttar Pradesh

Application for obtaining permission should be made to director@rsacup.org.in.`,
  "privacy-policy": `Thanks for visiting website of Remote Sensing Applications Centre, U.P. , Government of Uttar Pradesh, and reviewing our privacy policy.

We collect no personal information, like names or addresses, when you visit our website. If you choose to provide that information to us, it is only used to fulfill your request for information.

We do collect some technical information when you visit to make your visit seamless. The section below explains how we handle and collect technical information when you visit our website.

Information collected and stored automatically:

When you browse, read pages, or download information on this website, we automatically gather and store certain technical information about your visit. This information never identifies who you are. The information we collect and store about your visit is listed below:

The Internet domain of your service provider (e.g. mtnl.net.in) and IP address (an IP address is a number that is automatically assigned to your computer whenever you are surfing the web) from which you access our website.
The type of browser (such as Firefox, Netscape, or Internet Explorer) and operating system (Windows, Linux) used to access our site.
The date and time you accessed our site.
The pages/URLs you have visited and
If you reached this website from another website, the address of that referring website.

This information is only used to help us make the site more useful for you. With this data, we learn about the number of visitors to our site and the types of technology our visitors use. We never track or record information about individuals and their visits.

Cookies

When you visit some websites, they may download small pieces of software known as cookies on your computer/browsing device. Some cookies collect personal information to Recognise your computer in the future. We only use non-persistent cookies or “per- session cookies”.

Per-session cookies serve technical purposes, like providing seamless navigation through this website. These cookies do not collect personal information of users and they are deleted as soon as you leave our website. The cookies do not permanently record data and they are not stored on your computer’s hard drive. The cookies are stored in memory and are only available during an active browser session. Again, once you close your browser, the cookie disappears.

If you send us personal information:

We do not collect personal information for any purpose other than to respond to you (for example, to respond to your questions or provide subscriptions you have chosen). If you choose to provide us with personal information— like filling out a Contact Us form, with an e-mail address or postal address, and submitting it to us through the website—we use that information to respond to your message, and to help you get the information you’ve requested. We only share the information you give us with another Government agency if your question relates to that agency, or as otherwise required by law.

Our website never collects information or creates individual profiles for commercial marketing. While you must provide an e-mail address for a Localised response to any incoming questions or comments to us, we recommend that you do NOT include any other personal information.

Site Security

For site security purposes and to ensure that this service remains available to all users, the Government computer system employs commercial software programs to monitor network traffic to identify Unauthorised attempts to upload or change information, or otherwise cause damage.

Except for Authorised law enforcement investigations, no other attempts are made to identify individual users or their usage habits. Raw data logs are used for no other purposes and are scheduled for regular deletion.

Unauthorised attempts to upload information or change information on this service are strictly prohibited and may be punishable under the Indian IT Act.`,
  "hyperlinking-policy": `Prior permission is required before Hyperlinks are directed from any website to this site. Permission for the same, stating the nature of the content on the pages from where the link has to be given and the exact language of the Hyperlink should be obtained by sending a request at Contact Us.`,
  disclaimer: `This website is provided “as is” without any representations or warranties, express or implied. Organization makes no representations or warranties in relation to this website or the information and materials provided on this website. Without prejudice to the generality of the foregoing paragraph, Organization does not warrant that:

This website will be constantly available, or available at all
The information on this website is complete, true, accurate or non-misleading.

Nothing on this website constitutes, or is meant to constitute, advice of any kind. If you require advice in relation to any legal, financial, medical or in relation to Organization matter you should consult an appropriate professional. Limitations of liability

Organization will not be liable to you (whether under the law of contract, the law of torts or any other Laws of India) in relation to the contents of, or use of, or otherwise in connection with, this website:

To the extent that the website is provided free-of-charge, for any direct loss
For any indirect, special or consequential loss
For any business losses, loss of revenue, income, profits or anticipated savings, loss of contracts or business relationships, loss of reputation or goodwill, or loss or corruption of information or data.

These limitations of liability apply even if Organization has been expressly advised of the potential loss. Exceptions Nothing in this website disclaimer will exclude or limit any warranty implied by law that it would be unlawful to exclude or limit; and nothing in this website disclaimer will exclude or limit Organization liability in respect of any:

Death or personal injury caused by Organization negligence
Fraud or fraudulent misrepresentation on the part of Organization
Matter which it would be illegal or unlawful for Organization to exclude or limit, or to attempt or purport to exclude or limit, its liability.`,
  help: `Viewing Information for Various File Formats

This website includes some content that is available in non-HTML format. They might not be visible properly if your browser does not have the required plug-ins.

For example, Acrobat Reader software is required to view Adobe Acrobat PDF files. If you do not have this software installed on your computer, you can download it for free. The following table lists some plug-ins that you will require.

Document Type	Download
PDF content	Adobe Acrobat Reader
Word files	If you have already installed MS Word [Version 2003, 2007 or 2010] or OpenOffice then you can directly view Word files or you can download from below links.

Word Viewer 2003 (in any version till 2003)
Microsoft Office Compatibility Pack for Word (for 2007 version)
OpenOffice
Excel files	If You have already installed MS Excel [Version 2003, 2007 or 2010] or OpenOffice then you can directly view Excel files or you can download from below links.

Excel Viewer 2003 (in any version till 2003)
Microsoft Office Compatibility Pack for Excel (for 2007 version)
OpenOffice
PowerPoint presentations	If You have already installed MS PowerPoint [Version 2003, 2007 or 2010] or OpenOffice then you can directly view PowerPoint files or you can download from below links.

PowerPoint Viewer 2003 (in any version till 2003)
Microsoft Office Compatibility Pack for PowerPoint (for 2007 version)
OpenOffice
Flash content	Adobe Flash Player
Audio/Video Files	Windows Media Player
RealPlayer

Screen Reader Access

Remote Sensing Applications Centre, U.P. , Government of Uttar Pradesh website complies with World Wide Web Consortium (W3C) Web Content Accessibility Guidelines (WCAG) 2.0 level AA. This will enable people with visual impairments access the website using Assistive technologies, such as screen readers. The information of the website is accessible with different screen readers.

Speech Recognition Support

The information of the website is accessible with different speech recognition software, such as Dragon Naturally Speaking as well as Speech Recognition support available in Windows Vista and Windows 7 operating systems. This will enable people with mobility impairments, people with visual impairments and senior citizens access the website using Assistive technologies, such as speech recognition software.

Using the Search Facility

The Search facility is located at the top right hand corner of all the pages. The Basic Search enables you to search for a website using word OR phrase in site Title OR URL.

Sitemap

You can visit Sitemap page to get an overall view of the contents of this site. You can also navigate around the site by clicking on the Sitemap link.

Feedback/Suggestion

You can use the Feedback form to submit your comments, feedback, suggestions and ideas for improvements to Remote Sensing Applications Centre, U.P. , Government of Uttar Pradesh.

Do you need further help?

If you need further help, please Contact us.`,
};

const officialPolicyBodiesHindi = {
  "terms-and-conditions": `इस वेबसाइट की अभिकल्पना, विकास एवं अनुरक्षण उत्तर प्रदेश डेवलपमेंट सिस्टम्स कारपोरेशन लिमिटिड की ओर से ओमनी-नेट टेक्नोलॉजी प्राइवेट लिमिटिड द्वारा किया गया है तथा यह उत्तर प्रदेश स्टेट डाटा सेंटर, लखनऊ द्वारा होस्ट की गई है।

हालांकि इस वेबसाइट पर अंतर्वस्‍तु की सटीकता सुनिश्चित करने के लिए सभी प्रयास किए गए हैं, फिर भी इसे कानून के वक्‍तव्‍य के रूप में नहीं समझना चाहिए अथवा किसी कानूनी प्रयोजन के लिए प्रयुक्‍त नहीं करना चाहिए। रिमोट सेन्सिंग एप्लीकेशन सेंटर, उत्तर प्रदेश, उत्तर प्रदेश सरकार की सटीकता, पूर्णता, उपयोगिता या अन्‍यथा के संबंध में कोई जिम्‍मेदारी स्‍वीकार नहीं करता है। प्रयोक्‍ताओं को सलाह दी जाती है कि वेबसाइट पर प्रदान की गई किसी सूचना पर कार्रवाई करने से पूर्व सूचना की जांच / सत्‍यापन करें और कोई उपयुक्‍त पेशेवर सलाह प्राप्‍त करें।

किसी भी दशा में, रिमोट सेन्सिंग एप्लीकेशन सेंटर, उत्तर प्रदेश, उत्तर प्रदेश सरकार/ उत्तर प्रदेश डेवलपमेंट सिस्टम्स कारपोरेशन लिमिटिड/ सेवा प्रदाता डाटा के प्रयोग या प्रयोग की क्षति से उत्‍पन्‍न, इस वेबसाइट के प्रयोग के सिलसिले में या इसके प्रयोग से उत्‍पन्‍न किसी व्‍यय, क्षति या नुकसान जिसमें सीमा के बगैर प्रत्‍यक्ष या परिणामी नुकसान या क्षति या कोई व्‍यय, नुकसान या क्षति शामिल है, के लिए देनदार नहीं होगा।

प्रयोग की ये शर्तें भारतीय कानूनों के अनुसरण में अभिशासित होंगी और समझी जाएंगी। यदि इन शर्तों एवं निबंधनों के तहत कोई विवाद उत्‍पन्‍न होता है, तो वह भारत के न्‍यायालयों के अनन्‍य क्षेत्राधिकार के अधीन होगा।

सभी अंतर्वस्‍तु और सूचना रिमोट सेन्सिंग एप्लीकेशन सेंटर, उत्तर प्रदेश, भारत सरकार द्वारा आप तक लाई गई है।

कृपया इस वेबसाइट की निम्‍नलिखित निजता नीतियां, कॉपीराइट तथा हाइपरलिंकिंग नीति देखें। यदि आपको किसी और सूचना की जरूरत हो, तो कृपया निम्‍नलिखित पर जाएं या हमसे बेझिझक संपर्क करें।

गोपनीयता नीति
कॉपीराइट नीति
हाइपरलिंकिंग नीति`,
  "copyright-policy": `इस वेबसाइट पर मौजूद सामग्री कॉपीराइट संरक्षण के अधीन है बशर्ते ऐसा उल्लेख अन्यथा न हो। वेबसाइट में मौजूद किसी भी प्रकार की फ़ाइल या मुद्रण योग्य सामग्री पूर्व अनुमति की आवश्यकता के बिना डाउनलोड की जा सकती है। सामग्री का किसी भी अन्य प्रस्तावित उपयोग ( रिमोट सेंसिंग एप्लीकेशन सेंटर, उत्तर प्रदेश सरकार ) के अनुमोदन के अधीन है।

अनुमति प्राप्त करने के लिए आवेदन director@rsacup.org.in संपर्क सूत्र हेतु किया जाना चाहिए।`,
  "privacy-policy": `रिमोट सेन्सिंग एप्लीकेशन सेंटर, उत्तर प्रदेश , उत्तर प्रदेश सरकार की वेबसाइट को देखने और हमारी गोपनीयता नीति का आकलन करने के लिए धन्यवाद।

आप जब हमारी वेबसाइट को प्रयोग करते हैं तब हम किसी भी प्रकार की निजी जानकारी, जैसे नाम, पता आदि नहीं एकत्र करते। यदि आप यह सूचना हमें देते हैं तो इसका प्रयोग केवल आपके द्वारा मांगी गई सूचना को आपको प्रदान करने के लिए होगा।

आप द्वारा हमारी वेबसाइट का उपयोग आसान और त्रुटि-रहित बनाने के लिए हम कुछ तकनीकी जानकारी एकत्र करते हैं। निम्नलिखित विवरण में यह बताया गया है कि आप द्वारा हमारी वेबसाइट के प्रयोग किये जाने के दौरान हम ऐसी तकनीकी सूचना कैसे एकत्र करते हैं और इसका उपयोग कैसे करते हैं।

जब आप वेबसाइट के पृष्ठों से गुजरते हैं, उन्हें पढ़ते हैं या इस वेबसाइट से किसी सूचना को डाउनलोड करते हैं, तो हम आपके इस आगमन से स्वतः कुछ तकनीकी सूचना एकत्र करते हैं और उसे संरक्षित करते हैं। इस सूचना से यह कभी नहीं पता लगाया जा सकता कि आप कौन हैं। जो सूचना हम एकत्र करते हैं और संरक्षित करते हैं वह इस प्रकार है:

आपके सेवा प्रदाता (सर्विस प्रोवाइडर) का इन्टरनेट डोमेन (उदहारण के लिए mtnl.net.in) और उस उपकरण का आई पी एड्रेस जहाँ से आप हमारी वेबसाइट से जुड़ते हैं (आई पी एड्रेस वह संख्या है जो आप द्वारा वेब से जुड़ने पर स्वतः आपके कंप्यूटर को दी जाती है)।
हमारी वेबसाइट से जुड़ने के लिए उपयुक्त हुआ ब्राउज़र का प्रकार (जैसे फायरफॉक्स, नेटस्केप या इन्टरनेट एक्स्प्लोरर) और ऑपरेटिंग सिस्टम (विंडोज, लिनक्स)
आप द्वारा हमारी साईट से जुड़ने की तिथि और समय
उन पृष्ठों और यू आर एल का विवरण जिन्हें आपने देखा
यदि आप किसी और वेबसाइट से इस वेबसाइट पर आये हैं, तो उस वेबसाइट का एड्रेस।

इस सूचना का उपयोग केवल हम अपनी वेबसाइट को आपके लिए और बेहतर बनाने के लिए करते हैं। इन आंकड़ों से हम अपनी वेबसाइट पर आने वाले आगंतुकों की संख्या का पता लगाते हैं और यह भी जानकारी लेते हैं कि हमारे प्रयोगकर्ता किस प्रकार की टेक्नोलॉजी का प्रयोग करते हैं। हम कभी भी प्रयोगकर्ताओं और उनके आगमन की सूचना चिन्हित या एकत्र नहीं करते।

कूकीज

जब आप कुछ वेबसाइट पर जाते हैं, तब वे वेबसाइट आपके कंप्यूटर/वेबसाइट देखने के लिए प्रयुक्त उपकरण पर कुछ बहुत सूक्ष्म सॉफ्टवेयर डाउनलोड करते हैं जिन्हें कुकी कहा जाता है। कुछ कुकी निजी जानकारी भी एकत्र करती हैं जिससे वे भविष्य में आपके कंप्यूटर को पहचान सकें। हम केवल ऐसी कुकी का प्रयोग करते हैं जो दोहराई नहीं जाती, या एक बार प्रयोग की जाने वाली होती हैं।

एक बार प्रयोग की जाने वाली कुकी का तकनीकी उपयोग होता है, जैसे इस वेबसाइट पर त्रुटि और बाधा रहित ब्राउज़िंग। ये कुकी प्रयोगकर्ताओं की कोई भी निजी सूचना नहीं एकत्र करती और जैसे ही आप हमारी वेबसाइट से हटते हैं इनका स्वतः अंत हो जाता है। ये कुकी किसी भी सूचना को स्थाई तौर पर नहीं एकत्र करती और ये आपके कंप्यूटर के हार्ड ड्राइव पर नहीं एकत्र होती है। ये कुकी केवल मेमोरी में एकत्र होती हैं और केवल ब्राउज़िंग के दौरान ही उपलब्ध होती हैं। जैसे ही आपका ब्राउज़िंग का सत्र समाप्त होता है ये कुकी विलुप्त हो जाती हैं।

यदि आप हमें निजी सूचना भेजते हैं

हम किसी भी उद्देश्य से कोई निजी सूचना नहीं एकत्र करते सिवाय उस स्थिति के जब हमें आपको उत्तर देना होता है (उदहारण के लिए, आपके प्रश्नों का जवाब, या आपके द्वारा चुनी गयी जानकारी आपको भेजने के लिए)। यदि आप हमें अपनी निजी जानकारी देते हैं – जैसे "हमें संपर्क करें" का फॉर्म भरते हुए, जिसमे ईमेल या डाक का पता दिया गया हो, और जिसे आप हमें इस वेबसाइट के द्वारा हमें भेजते हैं – तब हम उस जानकारी का प्रयोग आपके साथ पत्राचार करने के लिए और आपके द्वारा वांछित सूचना को आप तक भेजने में आप की मदद करने के लिए करते हैं। हम आपकी जानकारी किसी अन्य शासकीय संस्था के साथ उसी स्थिति में साझा करते हैं जब आप का प्रश्न उस शासकीय संस्थान से सम्बंधित होता है, या ऐसा किसी कानून के अंतर्गत वांछित होता है।

हमारी वेबसाइट कभी भी व्यापार से जुड़े विपणन (मार्केटिंग) के लिए जानकारी एकत्र नहीं करती या व्यक्तिगत प्रोफाइल नहीं बनाती है। यदि आपको अपने किसी प्रश्न के उत्तर में कोई स्थानीय सूचना चाहिए, या आप अपनी राय देना चाहते हैं, तो आपको अपना ईमेल पता देना आवश्यक है, लेकिन यह हमारी संस्तुति है कि आप अपनी कोई निजी जानकारी साझा न करें।

साईट की सुरक्षा

साईट की सुरक्षा के लिए और यह सुनिश्चित करने के लिए कि यह सेवा सभी प्रयोगकर्ताओं को हमेशा उपलब्ध रहे, हमारा शासकीय कंप्यूटर सिस्टम कतिपय वाणिज्यिक सॉफ्टवेयर का प्रयोग करता है जिनसे नेटवर्क की गतिविधियों पर नजर रखी जा सके जिससे अनधिकृत तौर पर सूचना डाले जाने या परिवर्तित करने के प्रयासों को रोका जा सके, या किसी अन्य तरह से इसे नुकसान पहुचाया जा सके।

अधिकृत कानून प्रवर्तन एजेंसियों के द्वारा की जाने वाली जांच के अतिरिक्त, ऐसा कोई भी प्रयास नहीं किया जाता जिससे व्यक्तिगत प्रयोगकर्ताओं को चिन्हित किया जा सके, या उनके द्वारा प्रयोग करने के तरीके को चिन्हित किया जा सके। स्व-जनित आंकड़ों के समूह को किसी भी अन्य प्रयोजन के लिए प्रयुक्त नहीं किया जाता और इन्हें लगातार सामाप्त किया जाता है।

इस सेवा पर अनिधिकृत तरीके से सूचना डाले जाने या इसे बदलने के प्रयास पूरी तरह से प्रतिबंधित हैं, और ऐसे कृत्यों को भारत के सूचना तकनीकी कानून (आई टी एक्ट) के अंतर्गत दण्डित किया जा सकता है।`,
  "hyperlinking-policy": `किसी अन्य वेबसाइट/पोर्टल से इस वेबसाइट के लिए किसी प्रकार की हाइपरलिंक को निर्देशित करने के लिए पूर्व अनुमति आवश्यक है। इस प्रकार की अनुमति प्राप्त करने के लिए director@rsacup.org.in पे अनुरोध किया जाना चाहिए और ऐसे आवेदन में उन पृष्ठों की सामग्री का ब्यौरा, जिनसे ऐसी लिंक निर्देशित की जानी है, और हाइपरलिंक की यथातथ्य भाषा, का उल्लेख आवश्यक है।`,
  help: `विभिन्‍न फाइल फार्मेट के लिए सूचना देखना

इस वेबसाइट में कुछ ऐसी अंतर्वस्‍तुएं शामिल हैं जो गैर एचटीएमएल फार्मेट में उपलब्‍ध हैं। यदि आपके ब्राउजर में अपेक्षित प्‍लग-इन नहीं होगा, तो हो सकता है कि वे ठीक से न दिखें।

उदाहरण के लिए, एडोब एक्रोबैट पीडीएफ फाइलों को देखने के लिए एक्रोबैट रीडर साफ्टवेयर अपेक्षित है। यदि आपके कंप्‍यूटर पर यह साफ्टवेयर इंस्‍टाल नहीं है, तो आप इसे मुफ्त में डाउनलोड कर सकते हैं। निम्‍नलिखित सारणी में कुछ प्‍लग-इन सूचीबद्ध किए गए हैं जिनकी आपको जरूरत होगी।

दस्‍तावेज का प्रकार	डाउनलोड
पीडीएफ अंतर्वस्‍तु	एडोब एक्रोबैट रीडर
वर्ड फाइल	यदि आपने एमएस वर्ड [वर्जन 2003, 2007 या 2010] या ओपन ऑफिस पहले से इंस्‍टाल किया है, तो आप वर्ड की फाइलें सीधे देख सकते हैं अथवा आप नीचे दिए गए लिंक से डाउनलोड कर सकते हैं।

वर्ड व्‍यूअर 2003 (2003 तक किसी वर्जन में)
वर्ड (वर्जन 2007 के लिए) के लिए माइक्रोसॉफ्ट ऑफिस कंपैटिबिलिटी पैक
ओपन ऑफिस
एक्‍सल फाइल	यदि आपने एमएस एक्‍सल [वर्जन 2003, 2007 या 2010] या ओपन ऑफिस पहले से इंस्‍टाल किया है, तो आप एक्‍सल की फाइलें सीधे देख सकते हैं अथवा आप नीचे दिए गए लिंक से डाउनलोड कर सकते हैं।

एक्‍सल व्‍यूअर 2003 (2003 तक किसी वर्जन में)
एक्‍सल (वर्जन 2007 के लिए) के लिए माइक्रोसॉफ्ट ऑफिस कंपैटिबिलिटी पैक
ओपन ऑफिस
पॉवरप्‍वाइंट प्रजेंटेशन	यदि आपने एमएस पॉवरप्‍वाइंट [वर्जन 2003, 2007 या 2010] या ओपन ऑफिस पहले से इंस्‍टाल किया है, तो आप पॉवरप्‍वाइंट की फाइलें सीधे देख सकते हैं अथवा आप नीचे दिए गए लिंक से डाउनलोड कर सकते हैं।

पॉवरप्‍वाइंट व्‍यूअर 2003 (2003 तक किसी वर्जन में)
पॉवरप्‍वाइंट (वर्जन 2007 के लिए) के लिए माइोसॉफ्ट ऑफिस कंपैटिबिलिटी पैक
ओपन ऑफिस
फ्लैश अंतर्वस्‍तु	एडोब फ्लैश प्‍लेयर
श्रव्य / दृश्‍य फाइल	विंडोज मीडिया प्‍लेयर
रियल ऑफिस

स्‍क्रीन रीडर अक्‍सेस

रिमोट सेन्सिंग एप्लीकेशन सेंटर, उत्तर प्रदेश , उत्तर प्रदेश सरकार की वेबसाइट विश्‍वव्‍यापी वेब कंसोर्टियम (डब्‍ल्‍यू 3 सी) वेब अंतर्वस्‍तु अभिगम्‍यता दिशानिर्देश (डब्‍ल्‍यू सी ए जी) 2.0 लेवल एए का अनुपालन करता है। यह दृष्टि विकलांग व्‍यक्तियों को सहायक प्रौद्योगिकियों, जैसे कि स्‍क्रीन रीडर का प्रयोग करके वेबसाइट को अक्‍सेस करने में समर्थ बनाएगा। इस वेबसाइट की सूचना को विभिन्‍न स्‍क्रीन रीडर जैसे कि जे ए डब्‍ल्‍यू एस से अक्‍सेस किया जा सकता है।

वक्‍तृता पहचान सहायता

विभिन्‍न वक्‍तृता पहचान साफ्टवेयर जैसे कि ड्रैगन नेचुरली स्‍पीकिंग से इस वेबसाइट की सूचना को अक्‍सेस किया जा सकता है तथा विंडोज विस्‍टा एवं विंडोज 7 आपरेटिंग सिस्‍टम में वक्‍तृता पहचान सहायता उपलब्‍ध है ... यह चलने फिरने में असमर्थ व्‍यक्तियों, दृष्टि विकलांग व्‍यक्तियों तथा वरिष्‍ठ नागरिकों को सहायक प्रौद्योगिकियों जैसे कि वक्‍तृता पहचान साफ्टवेयर का प्रयोग करके वेबसाइट को अक्‍सेस करने में समर्थ बनाएगा।

सर्च सुविधा का प्रयोग करना

सर्च की सुविधा सभी पृष्‍ठों के शीर्ष पर दाएं कोने में मौजूद है। बेसिक सर्च आपको साइट टाइटल अथवा यू आर एल में शब्‍द या पदबंध का प्रयोग करके किसी वेबसाइट को सर्च करने में समर्थ बनाता है।

साइट मैप

इस साइट की अंतर्वस्‍तुओं का समग्र रूप में जायजा लेने के लिए आप साइट मैप पेज पर जा सकते हैं। आप साइट मैप लिंक पर क्लिक करके साइट के चारों ओर नेविगेट भी कर सकते हैं।

फीडबैक / सुझाव

आप सुधार के लिए रिमोट सेन्सिंग एप्लीकेशन सेंटर, उत्तर प्रदेश , उत्तर प्रदेश सरकार को अपनी टिप्‍पणियां, फीडबैक, सुझाव तथा विचार प्रस्‍तुत करने के लिए प्रतिक्रिया फार्म का प्रयोग कर सकते हैं।

क्‍या आपको और सहायता की जरूरत है?

यदि आपको और सहायता की जरूरत है, तो कृपया हमसे संपर्क करें।`,
};

const faqEnglish = [
  {
    heading: "Question 1: Director's Compulsory Liability and Rights",
    body: [
      "<p>The director of the centre is the post as the Head of the Department and is entitled to all the powers of the Head of the Department. The director is appointed by the Chairman of the General Body on the recommendation of the Chairman of the Governing Body. The Chairman of the General Body is the appointing authority of the director.</p>",
      "<p>The director is the member secretary of the Governing Body. The main rights and liabilities of the director are as follows:</p>",
      "<ul><li>Discharge all administrative, financial, and technical obligations of the Centre.</li><li>Convene meetings of the Governing Body and present policy matters of the Centre.</li><li>Ensure compliance with decisions taken by the Governing Body.</li><li>Guide, arrange, and monitor implementation of the Centre's projects.</li><li>Constitute committees for smooth operation, decide on their recommendations, and review their proceedings.</li><li>Act as appointing and disciplinary authority for scientists in the scientific cadre.</li><li>Act as appointing and disciplinary authority for administrative and assistant technical personnel.</li><li>Approve leave and travel schedules of all heads.</li><li>Coordinate with the Government of Uttar Pradesh at different levels.</li><li>Proceed according to the General Service Rules.</li></ul>",
    ].join(""),
  },
  {
    heading: "Question 2: Sample formats for generation of geo-referenced data/Map, diversion of forest land for non-forestry purposes (under the Forest (Conservation) Act, 1980).",
    documents: [
      {
        title: "Sample formats for generation of geo-referenced data/Map",
        url: `${faqMediaRoot}/201808231536565467GDGNF_format_090218.pdf`,
        meta: "Size: 1.46 MB | Language: English",
      },
    ],
  },
  {
    heading: "Question 3: Chief Secretary's Order; Remote Sensing, GIS & GPS related technologies work by Remote Sensing Applications Centre U.P.",
    documents: [
      {
        title: "Chief Secretary's Order - 14-09-2023",
        url: `${faqMediaRoot}/202309141059266354Remote-Sensing-GIS-GPS-Technique.pdf`,
        meta: "Date: 14-09-2023 | Language: English",
      },
      {
        title: "Chief Secretary's Order - 18-12-2018",
        url: `${faqMediaRoot}/202303101531269500Adobe-Scan-Mar-10-2023.pdf`,
        meta: "Date: 18-12-2018 | Language: English",
      },
      {
        title: "Chief Secretary's Order - 25-01-2016",
        url: `${faqMediaRoot}/20200122172906532625-01-2016_220120.pdf`,
        meta: "Date: 25-01-2016 | Language: English",
      },
      {
        title: "Chief Secretary's Order - 05-08-2013",
        url: `${faqMediaRoot}/20200122172906532605-08-2013_220120.pdf`,
        meta: "Date: 05-08-2013 | Language: English",
      },
      {
        title: "Chief Secretary's Order - 17-09-2004",
        url: `${faqMediaRoot}/20200122172906517017-09-2004_220120.pdf`,
        meta: "Date: 17-09-2004 | Language: English",
      },
      {
        title: "Chief Secretary's Order - 25-09-2000",
        url: `${faqMediaRoot}/20200122172906501325-09-2000_220120.pdf`,
        meta: "Date: 25-09-2000 | Language: English",
      },
    ],
  },
  {
    heading: "Question 4: Scientist's Seniority List.",
    documents: [
      {
        title: "Scientists' Seniority List - 13-09-2023",
        url: `${faqMediaRoot}/202405131456216687seniority-list.pdf`,
        meta: "Date: 13-09-2023 | Language: Hindi",
      },
    ],
  },
  {
    heading: "Question 5: Who will provide the services of Personnel to RSAC-UP?",
    body: [
      "<p><strong>Vanshika HR Services Private Limited</strong></p>",
      "<p>7 & 8, Second Floor, Rani Saltanat Plaza,<br>Hazratganj, Lucknow-226001</p>",
      "<p>vanshikahrservices@gmail.com<br>www.vanshikahr.in</p>",
      "<p>Office (11:00 AM to 7:00 PM); Contact no. +91-9120002814<br>Mr. Indrajeet Singh, Manager; Contact no. +91-9307945418</p>",
    ].join(""),
  },
  {
    heading: "Question 6: What are the provisions and objectives of India's most recent National Geospatial Policy?",
    documents: [
      {
        title: "National Geospatial Policy-2022",
        url: `${faqMediaRoot}/202512221637247612National-Geospatial-Policy-2022.pdf`,
        meta: "Size: 1.56 MB | Language: Hindi/English",
      },
    ],
  },
  {
    heading: "Question 7: What are the Survey of India's recommended and guiding tender specifications for surveying activities such as drone operations, GNSS surveys, and related geospatial data acquisition?",
    documents: [
      {
        title: "Survey of India",
        url: `${faqMediaRoot}/202512221549121876SURVEY-OF-INDIA.pdf`,
        meta: "Size: 254 kB | Language: English",
      },
    ],
  },
];

const faqHindi = [
  {
    heading: "प्रश्न 1: निदेशक के पदगत दायित्व एवं अधिकार",
    body: [
      "<p>केन्द्र के निदेशक का पद विभागाध्यक्ष का पद है एवं उन्हें विभागाध्यक्ष के समस्त अधिकार प्रदत्त हैं। केन्द्र के निदेशक की नियुक्ति केन्द्र के सभापति द्वारा प्रबन्धकारिणी समिति की संस्तुति के आधार पर की जाती है और वे ही केन्द्र के निदेशक के नियुक्ति प्राधिकारी होते हैं।</p>",
      "<p>केन्द्र के निदेशक केन्द्र की प्रबन्धकारिणी समिति के पदेन सदस्य सचिव होते हैं। निदेशक के प्रमुख दायित्व एवं अधिकार निम्नवत हैं:</p>",
      "<ul><li>केन्द्र के प्रशासन, वित्तीय एवं तकनीकी दायित्वों का सम्पूर्ण निर्वहन करना।</li><li>प्रबन्धकारिणी समिति की समय-समय पर बैठकें बुलाना तथा समिति के समक्ष केन्द्र के नीतिगत प्रकरण प्रस्तुत करना।</li><li>प्रबन्धकारिणी समिति द्वारा लिये गये निर्णयों का अनुपालन सुनिश्चित कराना।</li><li>केन्द्र की विभिन्न परियोजनाओं में मार्गदर्शन प्रदान करना तथा उनके क्रियान्वयन की व्यवस्था एवं अनुश्रवण करना।</li><li>केन्द्र के सुचारू संचालन हेतु समितियों का गठन करना, उनकी संस्तुतियों पर निर्णय लेना और कार्यवाही की समीक्षा करना।</li><li>वैज्ञानिक संवर्ग के वैज्ञानिकों के नियुक्ति प्राधिकारी एवं दण्डाधिकारी के रूप में कार्य करना।</li><li>समस्त प्रशासकीय एवं सहायक तकनीकी कार्मिकों के नियुक्ति प्राधिकारी एवं दण्डाधिकारी के रूप में कार्य करना।</li><li>समस्त प्रभागाध्यक्षों के अवकाश एवं यात्रा कार्यक्रम स्वीकृत करना।</li><li>उत्तर प्रदेश शासन से विभिन्न स्तरों पर समन्वय स्थापित करना।</li><li>केन्द्र की सामान्य सेवा नियमावली के अनुरूप कार्यवाही करना।</li></ul>",
    ].join(""),
  },
  {
    heading: "प्रश्न 2: भू-संदर्भित डेटा/मानचित्र तथा गैर-वानिकी प्रयोजनों के लिए वन भूमि के उपयोग हेतु नमूना प्रारूप का सृजन (वन (संरक्षण) अधिनियम, 1980 के अंतर्गत)।",
    documents: [
      {
        title: "भू-संदर्भित डेटा/मानचित्र हेतु नमूना प्रारूप",
        url: `${faqMediaRoot}/201808231536565467GDGNF_format_090218.pdf`,
        meta: "आकार: 1.46 MB | भाषा: अंग्रेजी | अपलोड तिथि: 23/08/2018",
      },
    ],
  },
  {
    heading: "प्रश्न 3: सुदूर संवेदन, जीआईएस एवं जीपीएस तकनीक से संबंधित कार्य आरएसएसी-यूपी द्वारा कराये जाने के संबंध में मुख्य सचिव के आदेश।",
    documents: [
      {
        title: "मुख्य सचिव का आदेश - 14-09-2023",
        url: `${faqMediaRoot}/202309141059266354Remote-Sensing-GIS-GPS-Technique.pdf`,
        meta: "दिनांक: 14-09-2023 | भाषा: अंग्रेजी",
      },
      {
        title: "मुख्य सचिव का आदेश - 18-12-2018",
        url: `${faqMediaRoot}/202303101531269500Adobe-Scan-Mar-10-2023.pdf`,
        meta: "दिनांक: 18-12-2018 | भाषा: अंग्रेजी",
      },
      {
        title: "मुख्य सचिव का आदेश - 25-01-2016",
        url: `${faqMediaRoot}/20200122172906532625-01-2016_220120.pdf`,
        meta: "दिनांक: 25-01-2016 | भाषा: अंग्रेजी",
      },
      {
        title: "मुख्य सचिव का आदेश - 05-08-2013",
        url: `${faqMediaRoot}/20200122172906532605-08-2013_220120.pdf`,
        meta: "दिनांक: 05-08-2013 | भाषा: अंग्रेजी",
      },
      {
        title: "मुख्य सचिव का आदेश - 17-09-2004",
        url: `${faqMediaRoot}/20200122172906517017-09-2004_220120.pdf`,
        meta: "दिनांक: 17-09-2004 | भाषा: अंग्रेजी",
      },
      {
        title: "मुख्य सचिव का आदेश - 25-09-2000",
        url: `${faqMediaRoot}/20200122172906501325-09-2000_220120.pdf`,
        meta: "दिनांक: 25-09-2000 | भाषा: अंग्रेजी",
      },
    ],
  },
  {
    heading: "प्रश्न 4: वैज्ञानिकों की वरिष्ठता सूची",
    documents: [
      {
        title: "वैज्ञानिकों की वरिष्ठता सूची - 13-09-2023",
        url: `${faqMediaRoot}/202405131456216687seniority-list.pdf`,
        meta: "दिनांक: 13-09-2023 | भाषा: हिन्दी",
      },
    ],
  },
  {
    heading: "प्रश्न 5: आरएसएसी-यूपी को कार्मिक सेवाएं कौन प्रदान करेगा?",
    body: [
      "<p><strong>वांशिका एचआर सर्विसेज प्राइवेट लिमिटेड</strong></p>",
      "<p>7 और 8, दूसरी मंजिल, रानी सल्तनत प्लाजा,<br>हजरतगंज, लखनऊ-226001</p>",
      "<p>vanshikahrservices@gmail.com<br>www.vanshikahr.in</p>",
      "<p>कार्यालय समय (11:00 AM से 7:00 PM); संपर्क नंबर: +91-9120002814<br>श्री इन्द्रजीत सिंह, प्रबंधक; संपर्क नंबर: +91-9307945418</p>",
    ].join(""),
  },
  {
    heading: "प्रश्न 6: भारत की नवीनतम राष्ट्रीय भू-स्थानिक नीति के प्रावधान और उद्देश्य क्या हैं?",
    documents: [
      {
        title: "राष्ट्रीय भू-स्थानिक नीति-2022",
        url: `${faqMediaRoot}/202512221637247612National-Geospatial-Policy-2022.pdf`,
        meta: "आकार: 1.56 MB | भाषा: हिन्दी/अंग्रेजी | अपलोड तिथि: 22/12/2025",
      },
    ],
  },
  {
    heading: "प्रश्न 7: ड्रोन संचालन, जीएनएसएस सर्वेक्षण और संबंधित भू-स्थानिक डेटा अधिग्रहण जैसी गतिविधियों के लिए सर्वे ऑफ इंडिया के अनुशंसित निविदा विनिर्देश क्या हैं?",
    documents: [
      {
        title: "सर्वे ऑफ इंडिया",
        url: `${faqMediaRoot}/202512221549121876SURVEY-OF-INDIA.pdf`,
        meta: "आकार: 254 kB | भाषा: अंग्रेजी | अपलोड तिथि: 22/12/2025",
      },
    ],
  },
];

const appellateEnglish = {
  slug: "appellate-authority",
  sort: 1,
  title: "Appellate Authority",
  eyebrow: "Right to Information",
  summary: "",
  sections: [
    {
      heading: "Appellate Authority",
      officers: [
        { name: "Mr. Sushil Chandra", post: "First Appellate Officer", phone: "+91-8765977653" },
        { name: "Dr. Anil Kumar", post: "Public Information Officer", phone: "+91-8765977669" },
        { name: "Shri Ramakant", post: "Asstt. Public Information Officer", phone: "+91-8765977643" },
      ],
      address: "Remote Sensing Applications Centre, U.P., Sector-G, Jankipuram, Kursi Road, Lucknow-226021. Phone: 0522-2730451.",
    },
  ],
  links: [{ label: "Right to Information (RTI)", path: "/rti" }],
  sourceUrl: "https://rsac.up.gov.in/en/page/appellate-authority",
};

const appellateHindi = {
  slug: "appellate-authority",
  sort: 1,
  title: "अपीलीय प्राधिकरण",
  eyebrow: "सूचना का अधिकार",
  summary: "",
  sections: [
    {
      heading: "अपीलीय प्राधिकरण",
      officers: [
        { name: "श्री सुशील चंद्र", post: "प्रथम अपीलीय अधिकारी", phone: "+91-8765977653" },
        { name: "डॉ. अनिल कुमार", post: "जन सूचना अधिकारी", phone: "+91-8765977669" },
        { name: "श्री रमाकांत", post: "सहायक जन सूचना अधिकारी", phone: "+91-8765977643" },
      ],
      address: "रिमोट सेंसिंग एप्लीकेशन्स सेंटर, उत्तर प्रदेश, सेक्टर-जी, जानकीपुरम, कुर्सी रोड, लखनऊ-226021। फोन: 0522-2730451।",
    },
  ],
  links: [{ label: "सूचना का अधिकार", path: "/rti" }],
  sourceUrl: "https://rsac.up.gov.in/hi/article/appellate-authority",
};

const memorandumEnglish = {
  slug: "memorandum-of-association",
  sort: 2,
  title: "Memorandum of Association",
  eyebrow: "Right to Information",
  summary: "",
  sections: [
    {
      heading: "Memorandum of Association",
      documents: [
        {
          title: "Memorandum of Association",
          url: "/official-media/siteContent/pdf/memorendum_061017.pdf",
          meta: "Size: 1.3 MB | Language: English | Upload date: 30/12/2017",
        },
      ],
    },
  ],
  links: [{ label: "Right to Information (RTI)", path: "/rti" }],
  sourceUrl: "https://rsac.up.gov.in/en/page/memorandum-of-association",
};

const memorandumHindi = {
  slug: "memorandum-of-association",
  sort: 2,
  title: "मेमोरेंडम ऑफ एसोसिएशन",
  eyebrow: "सूचना का अधिकार",
  summary: "",
  sections: [
    {
      heading: "मेमोरेंडम ऑफ एसोसिएशन",
      documents: [
        {
          title: "मेमोरेंडम ऑफ एसोसिएशन",
          url: "/official-media/siteContent/pdf/memorendum_061017.pdf",
          meta: "आकार: 1.3 MB | भाषा: अंग्रेजी | अपलोड तिथि: 30/12/2017",
        },
      ],
    },
  ],
  links: [{ label: "सूचना का अधिकार", path: "/rti" }],
  sourceUrl: "https://rsac.up.gov.in/hi/article/memorandum-of-association",
};

const rulesEnglish = {
  slug: "general-service-rules",
  sort: 3,
  title: "General Service Rules",
  eyebrow: "Public Services",
  summary: "",
  sections: [
    {
      heading: "General Service Rules",
      documents: [
        {
          title: "General Service Rules",
          url: "/official-media/siteContent/pdf/general-service_161017.pdf",
          meta: "Size: 5.5 MB | Language: English | Upload date: 30/12/2017",
        },
      ],
    },
  ],
  links: [{ label: "Right to Information (RTI)", path: "/rti" }],
  sourceUrl: "https://rsac.up.gov.in/en/page/general-service-rules",
};

const rulesHindi = {
  slug: "general-service-rules",
  sort: 3,
  title: "सामान्य सेवा नियमावली",
  eyebrow: "जन सेवाएं",
  summary: "",
  sections: [
    {
      heading: "सामान्य सेवा नियमावली",
      documents: [
        {
          title: "सामान्य सेवा नियमावली",
          url: "/official-media/siteContent/pdf/general-service_161017.pdf",
          meta: "आकार: 5.5 MB | भाषा: अंग्रेजी | अपलोड तिथि: 30/12/2017",
        },
      ],
    },
  ],
  links: [{ label: "सूचना का अधिकार", path: "/rti" }],
  sourceUrl: "https://rsac.up.gov.in/hi/article/general-service-rules",
};

const insertAfterPath = (items, afterPath, item) => {
  const list = Array.isArray(items) ? items.filter((entry) => entry?.path !== item.path) : [];
  const index = list.findIndex((entry) => entry?.path === afterPath);
  list.splice(index >= 0 ? index + 1 : list.length, 0, item);
  return list;
};

const updateEntry = async (client, entryKey, update) => {
  const { rows } = await client.query(
    `SELECT id, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'public_info' AND entry_key = $1
      FOR UPDATE`,
    [entryKey]
  );
  if (!rows[0]) throw new Error(`Missing public_info/${entryKey}.`);
  const dataEn = structuredClone(rows[0].data_en || {});
  const dataHi = structuredClone(rows[0].data_hi || {});
  update(dataEn, dataHi);
  await client.query(
    `UPDATE cms_entries
        SET data_en = $2::jsonb,
            data_hi = $3::jsonb,
            version = version + 1,
            updated_at = now()
      WHERE id = $1`,
    [rows[0].id, JSON.stringify(dataEn), JSON.stringify(dataHi)]
  );
};

const upsertPublicInfo = async (client, entryKey, sortOrder, dataEn, dataHi) => {
  await client.query(
    `INSERT INTO cms_entries
       (collection, entry_key, status, sort_order, data_en, data_hi)
     VALUES ('public_info', $1, 'published', $2, $3::jsonb, $4::jsonb)
     ON CONFLICT (collection, entry_key) DO UPDATE
       SET status = 'published',
           sort_order = EXCLUDED.sort_order,
           data_en = EXCLUDED.data_en,
           data_hi = EXCLUDED.data_hi,
           version = cms_entries.version + 1,
           updated_at = now()`,
    [entryKey, sortOrder, JSON.stringify(dataEn), JSON.stringify(dataHi)]
  );
};

const client = new pg.Client({ connectionString: process.env.CMS_DATABASE_URL });
await client.connect();

try {
  await client.query("BEGIN");

  const policyRows = await client.query(
    `SELECT id, entry_key, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'policies'
        AND entry_key = ANY($1::text[])
      FOR UPDATE`,
    [Object.keys(officialPolicyBodiesEnglish)]
  );
  const policyRowsByKey = new Map(policyRows.rows.map((row) => [row.entry_key, row]));
  for (const [entryKey, officialBody] of Object.entries(officialPolicyBodiesEnglish)) {
    const row = policyRowsByKey.get(entryKey);
    if (!row) throw new Error(`Missing policies/${entryKey}.`);
    const dataEn = structuredClone(row.data_en || {});
    const dataHi = structuredClone(row.data_hi || {});
    dataEn.summary = "";
    dataEn.sections = [{
      heading: dataEn.title || entryKey,
      body: officialTextToHtml(officialBody),
    }];
    dataEn.sourceUrl = `https://rsac.up.gov.in/en/page/${
      entryKey === "terms-and-conditions" ? "terms-conditions" : entryKey
    }`;
    if (officialPolicyBodiesHindi[entryKey]) {
      dataHi.summary = "";
      dataHi.sections = [{
        heading: dataHi.title || dataEn.title || entryKey,
        body: officialTextToHtml(officialPolicyBodiesHindi[entryKey]),
      }];
      dataHi.sourceUrl = `https://rsac.up.gov.in/hi/article/${
        entryKey === "terms-and-conditions" ? "terms-and-conditions" : entryKey
      }`;
    }
    await client.query(
      `UPDATE cms_entries
          SET data_en = $2::jsonb,
              data_hi = $3::jsonb,
              version = version + 1,
              updated_at = now()
        WHERE id = $1`,
      [row.id, JSON.stringify(dataEn), JSON.stringify(dataHi)]
    );
  }

  await updateEntry(client, "feedback", (dataEn, dataHi) => {
    dataEn.summary = "Complete the below form to send us your comments and feedback on the website. Your opinion, suggestions and feedback will be very much appreciated. If you provide us with your contact information, we will be able to answer your questions.";
    dataHi.summary = "वेबसाइट पर अपनी टिप्पणियां और प्रतिक्रिया भेजने के लिए नीचे दिया गया फॉर्म भरें। आपकी राय, सुझाव और प्रतिक्रिया की बहुत सराहना की जाएगी। यदि आप हमें अपनी संपर्क जानकारी प्रदान करते हैं, तो हम आपके प्रश्नों का उत्तर दे सकेंगे।";
    dataEn.sections = [];
    dataHi.sections = [];
    dataEn.sourceUrl = "https://rsac.up.gov.in/en/feedback";
    dataHi.sourceUrl = "https://rsac.up.gov.in/hi/feedback";
  });

  await updateEntry(client, "faq", (dataEn, dataHi) => {
    Object.assign(dataEn, {
      title: "Frequently Asked Questions",
      summary: "",
      sections: faqEnglish,
      sourceUrl: "https://rsac.up.gov.in/en/page/faq",
    });
    Object.assign(dataHi, {
      title: "सामान्य प्रश्न",
      summary: "",
      sections: faqHindi,
      sourceUrl: "https://rsac.up.gov.in/hi/article/faq",
    });
  });

  await upsertPublicInfo(client, "appellate-authority", 1, appellateEnglish, appellateHindi);
  await upsertPublicInfo(client, "memorandum-of-association", 2, memorandumEnglish, memorandumHindi);
  await upsertPublicInfo(client, "general-service-rules", 3, rulesEnglish, rulesHindi);
  await client.query(
    `UPDATE cms_entries
        SET sort_order = CASE entry_key
          WHEN 'feedback' THEN 4
          WHEN 'tenders' THEN 5
          WHEN 'faq' THEN 6
          ELSE sort_order
        END,
        updated_at = now()
      WHERE collection = 'public_info'
        AND entry_key IN ('feedback', 'tenders', 'faq')`
  );

  const menuResult = await client.query(
    `SELECT id, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'menu_items'
        AND (data_en->>'path' = '/rti' OR entry_key = 'menu-9')
      ORDER BY (data_en->>'path' = '/rti') DESC
      LIMIT 1
      FOR UPDATE`
  );
  if (!menuResult.rows[0]) throw new Error("RTI menu entry is missing.");
  const menuEn = structuredClone(menuResult.rows[0].data_en || {});
  const menuHi = structuredClone(menuResult.rows[0].data_hi || {});
  menuEn.links = insertAfterPath(menuEn.links, "/rti", {
    label: "Appellate Authority",
    path: "/appellate-authority",
    description: "Official RTI appellate and public information officers.",
  });
  menuEn.links = insertAfterPath(menuEn.links, "/appellate-authority", {
    label: "Memorandum of Association",
    path: "/memorandum-of-association",
    description: "View the official RSAC-UP Memorandum of Association.",
  });
  menuEn.links = insertAfterPath(menuEn.links, "/memorandum-of-association", {
    label: "General Service Rules",
    path: "/general-service-rules",
    description: "View the official RSAC-UP General Service Rules document.",
  });
  menuHi.links = insertAfterPath(menuHi.links, "/rti", {
    label: "अपीलीय प्राधिकरण",
    path: "/appellate-authority",
    description: "सूचना का अधिकार संबंधी अपीलीय एवं जन सूचना अधिकारी।",
  });
  menuHi.links = insertAfterPath(menuHi.links, "/appellate-authority", {
    label: "मेमोरेंडम ऑफ एसोसिएशन",
    path: "/memorandum-of-association",
    description: "आरएसएसी-यूपी का आधिकारिक मेमोरेंडम ऑफ एसोसिएशन देखें।",
  });
  menuHi.links = insertAfterPath(menuHi.links, "/memorandum-of-association", {
    label: "सामान्य सेवा नियमावली",
    path: "/general-service-rules",
    description: "आरएसएसी-यूपी की आधिकारिक सामान्य सेवा नियमावली देखें।",
  });
  await client.query(
    `UPDATE cms_entries
        SET data_en = $2::jsonb,
            data_hi = $3::jsonb,
            version = version + 1,
            updated_at = now()
      WHERE id = $1`,
    [menuResult.rows[0].id, JSON.stringify(menuEn), JSON.stringify(menuHi)]
  );

  const settingsResult = await client.query(
    `SELECT id, data_en, data_hi
       FROM cms_entries
      WHERE collection = 'site_settings'
      ORDER BY sort_order, entry_key
      LIMIT 1
      FOR UPDATE`
  );
  if (!settingsResult.rows[0]) throw new Error("Site settings entry is missing.");
  const settingsEn = structuredClone(settingsResult.rows[0].data_en || {});
  const settingsHi = structuredClone(settingsResult.rows[0].data_hi || {});
  const sitemapEn = settingsEn.settings?.pageContent?.sitemap;
  const sitemapHi = settingsHi.settings?.pageContent?.sitemap;
  if (!sitemapEn || !sitemapHi) throw new Error("Sitemap settings are missing.");
  sitemapEn.publicLinks = insertAfterPath(sitemapEn.publicLinks, "/rti", {
    label: "Appellate Authority",
    path: "/appellate-authority",
  });
  sitemapEn.publicLinks = insertAfterPath(sitemapEn.publicLinks, "/appellate-authority", {
    label: "Memorandum of Association",
    path: "/memorandum-of-association",
  });
  sitemapEn.publicLinks = insertAfterPath(sitemapEn.publicLinks, "/memorandum-of-association", {
    label: "General Service Rules",
    path: "/general-service-rules",
  });
  sitemapHi.publicLinks = insertAfterPath(sitemapHi.publicLinks, "/rti", {
    label: "अपीलीय प्राधिकरण",
    path: "/appellate-authority",
  });
  sitemapHi.publicLinks = insertAfterPath(sitemapHi.publicLinks, "/appellate-authority", {
    label: "मेमोरेंडम ऑफ एसोसिएशन",
    path: "/memorandum-of-association",
  });
  sitemapHi.publicLinks = insertAfterPath(sitemapHi.publicLinks, "/memorandum-of-association", {
    label: "सामान्य सेवा नियमावली",
    path: "/general-service-rules",
  });
  await client.query(
    `UPDATE cms_entries
        SET data_en = $2::jsonb,
            data_hi = $3::jsonb,
            version = version + 1,
            updated_at = now()
      WHERE id = $1`,
    [settingsResult.rows[0].id, JSON.stringify(settingsEn), JSON.stringify(settingsHi)]
  );

  await client.query("COMMIT");
  console.log("Synchronized official RTI, policy, FAQ, and Feedback content.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
