export interface FaqItem {
  id: string
  question: string
  answer: string
  badge?: string
}

export interface FaqCategory {
  id: string
  title: string
  icon: string
  items: FaqItem[]
}

export const MASCOT_IMAGE_CONFIG = {
  path: "/images/faq-mascot.png",
  alt: "Gen D Arena FAQ Mascot",
  fallbackText: "GenD FAQ",
}

export const FAQ_DATA: FaqCategory[] = [
  {
    id: "thong-tin-chung",
    title: "1. THÔNG TIN CHUNG",
    icon: "🌐",
    items: [
      {
        id: "1.1",
        question: "1.1. Cuộc thi Gen D Arena 2026 là gì?",
        answer:
          "Gen D Arena 2026 là cuộc thi khởi nghiệp dành cho sinh viên và học viên trên địa bàn TP. Hồ Chí Minh, hướng đến phát triển các mô hình kinh doanh hoặc giải pháp giải quyết vấn đề thực tiễn dựa trên ứng dụng công nghệ và đổi mới sáng tạo.",
      },
      {
        id: "1.2",
        question: "1.2. Cuộc thi Gen D Arena 2026 hướng đến mục tiêu gì?",
        answer:
          "Cuộc thi nhằm kiến tạo môi trường trải nghiệm thực tế giúp thí sinh phát hiện vấn đề xã hội - kinh tế, nghiên cứu thị trường, xây dựng mô hình kinh doanh, phát triển giải pháp công nghệ và hoàn thiện kỹ năng thuyết trình dự án trước các chuyên gia và Hội đồng Ban Giám khảo.",
      },
      {
        id: "1.3",
        question: "1.3. Cuộc thi gồm có những vòng thi nào?",
        answer:
          "Cuộc thi được tổ chức qua 03 vòng thi chính:\n- Vòng 1: Sơ loại – DREAM: Ban Giám khảo tiến hành đánh giá hồ sơ dự án và lựa chọn TOP 10.\n- Vòng 2: Hackathon – DESIGN: Các đội thi tham gia chuỗi đào tạo, hoàn thiện giải pháp/sản phẩm và thực hiện video giới thiệu dự án. Sau vòng này, TOP 5 dự án xuất sắc nhất sẽ được chọn vào Vòng Chung kết.\n- Vòng 3: Chung kết – DEVELOP: TOP 5 tham gia triển lãm gian hàng, pitching và phản biện trực tiếp trước Hội đồng Ban Giám khảo.",
      },
    ],
  },
  {
    id: "doi-tuong",
    title: "2. ĐỐI TƯỢNG VÀ ĐIỀU KIỆN THAM GIA",
    icon: "👥",
    items: [
      {
        id: "2.1",
        question: "2.1. Đối tượng nào có thể đăng ký tham gia cuộc thi?",
        answer:
          "Sinh viên hoặc học viên đang theo học tại các trường đại học, cao đẳng trên địa bàn TP. Hồ Chí Minh đều có thể đăng ký tham gia nếu đáp ứng đầy đủ các điều kiện do BTC quy định.",
      },
      {
        id: "2.2",
        question:
          "2.2. Tôi đang học tại trường đại học ngoài địa bàn TP. Hồ Chí Minh thì có được tham gia không?",
        answer:
          "Theo thể lệ cuộc thi, đối tượng tham gia là sinh viên, học viên đang theo học tại các trường đại học, cao đẳng trên địa bàn TP. Hồ Chí Minh. Do đó, các cá nhân đang theo học tại các trường ngoài khu vực này chưa thuộc phạm vi đối tượng dự thi.",
      },
      {
        id: "2.3",
        question:
          "2.3. Tôi có thể đăng ký dự thi dưới hình thức cá nhân không?",
        answer:
          "Cuộc thi không áp dụng hình thức đăng ký cá nhân. Mỗi dự án phải được đăng ký theo đội thi với số lượng từ 03 đến 05 thành viên.",
      },
      {
        id: "2.4",
        question:
          "2.4. Các thành viên trong đội thi của tôi có bắt buộc phải học cùng một trường không?",
        answer:
          "Không bắt buộc. Gen D Arena khuyến khích việc thành lập các đội thi liên trường và liên ngành nhằm tối ưu hóa năng lực chuyên môn, với điều kiện tất cả thành viên đều thỏa mãn quy định đối tượng dự thi và đội thi duy trì số lượng từ 03 đến 05 người.",
      },
      {
        id: "2.5",
        question:
          "2.5. Thí sinh có thể tham gia đồng thời nhiều đội thi hoặc dự án khác nhau không?",
        answer:
          "Theo quy định của cuộc thi, mỗi thí sinh chỉ được phép đăng ký tham gia 01 đội thi và 01 dự án duy nhất trong suốt quá trình diễn ra cuộc thi.",
      },
      {
        id: "2.6",
        question:
          "2.6. Đội thi của tôi có được thay đổi hoặc bổ sung thành viên sau khi đăng ký không?",
        answer:
          "BTC không hỗ trợ việc thay đổi, bổ sung hoặc thay thế thành viên sau khi đội thi đã hoàn tất thủ tục đăng ký. Trong trường hợp có thành viên gặp sự cố cá nhân, đội thi vẫn tiếp tục tham gia cuộc thi với các thành viên còn lại.",
      },
    ],
  },
  {
    id: "du-an",
    title: "3. DỰ ÁN DỰ THI",
    icon: "🚀",
    items: [
      {
        id: "3.1",
        question:
          "3.1. Yêu cầu về đề bài và định hướng dự án của cuộc thi là gì?",
        answer:
          "Thí sinh cần đề xuất một mô hình kinh doanh hoặc giải pháp khởi nghiệp đáp ứng các tiêu chí:\n- Giải quyết một vấn đề thực tiễn rõ ràng trong xã hội hoặc thị trường.\n- Có ứng dụng yếu tố công nghệ hoặc giải pháp đổi mới sáng tạo.\n- Mang lại giá trị thiết thực cho người dùng, doanh nghiệp hoặc cộng đồng.",
      },
      {
        id: "3.2",
        question:
          "3.2. Cuộc thi Gen D Arena 2026 tiếp nhận các dự án thuộc những lĩnh vực nào?",
        answer:
          "Cuộc thi tiếp nhận các dự án thuộc 05 nhóm lĩnh vực chính:\n1. Giáo dục\n2. Y tế và Sức khỏe\n3. Kinh doanh, Thương mại và Tài chính\n4. Logistics và Chuỗi cung ứng\n5. Xã hội và Môi trường\n\nThí sinh nên chủ động lựa chọn lĩnh vực phù hợp nhất với bản chất vấn đề và nhóm đối tượng khách hàng mục tiêu của dự án.",
      },
      {
        id: "3.3",
        question:
          "3.3. Dự án của tôi có bắt buộc phải thành lập doanh nghiệp hoặc thương mại hóa trước khi đăng ký không?",
        answer:
          "Không. Thể lệ cuộc thi không yêu cầu dự án phải thành lập doanh nghiệp, có giấy phép kinh doanh hoặc đã đưa sản phẩm ra thương mại hóa trước thời điểm đăng ký dự thi.",
      },
      {
        id: "3.4",
        question:
          "3.4. Dự án của tôi có bắt buộc phải có sản phẩm hoàn chỉnh ngay từ Vòng Sơ loại không?",
        answer:
          "Không. Tại Vòng Sơ loại, các đội thi chỉ cần hoàn thiện và nộp hồ sơ trình bày ý tưởng, phân tích vấn đề, giải pháp và mô hình kinh doanh theo mẫu quy định của BTC.",
      },
      {
        id: "3.5",
        question:
          "3.5. Dự án đã từng tham gia các cuộc thi khởi nghiệp khác có được đăng ký không?",
        answer:
          "Thí sinh có thể sử dụng dự án đã từng dự thi ở các chương trình khác. Tuy nhiên, dự án sẽ không hợp lệ nếu thuộc một trong các trường hợp sau:\n- Dự án đã từng đạt các giải thưởng (Nhất, Nhì, Ba hoặc tương đương) tại các cuộc thi khởi nghiệp khác.\n- Dự án đã được đăng tải chính thức hoặc truyền thông báo chí rộng rãi.",
      },
      {
        id: "3.6",
        question:
          "3.6. Thành viên trong đội thi của tôi có bắt buộc phải biết kỹ năng lập trình không?",
        answer:
          "Không bắt buộc. Dự án cần thể hiện rõ tính ứng dụng của công nghệ, nhưng sản phẩm có thể được minh họa thông qua bản vẽ mẫu (mockup), bản thử nghiệm (prototype), bản thuyết trình, Figma, hoặc các công cụ no-code/low-code phù hợp. Tuy nhiên, đội thi cần trình bày được tính khả thi về kỹ thuật và lộ trình phát triển sản phẩm trong tương lai.",
      },
      {
        id: "3.7",
        question:
          "3.7. Tôi có thể sử dụng các công cụ trí tuệ nhân tạo (AI) để hỗ trợ xây dựng dự án không?",
        answer:
          "Đội thi được phép sử dụng các công cụ AI hỗ trợ trong quá trình nghiên cứu thị trường, phân tích dữ liệu, phác thảo chân dung khách hàng, lên ý tưởng, thiết kế mockup hoặc hỗ trợ phát triển sản phẩm. Tuy nhiên, đội thi phải chịu hoàn toàn trách nhiệm về tính chính xác, tính nguyên gốc và bản quyền của toàn bộ hồ sơ dự thi.",
      },
      {
        id: "3.8",
        question:
          "3.8. Dự án định hướng tác động xã hội, cộng đồng hoặc bảo vệ môi trường có đủ điều kiện tham gia không?",
        answer:
          "Có. Xã hội và Môi trường là một trong năm nhóm lĩnh vực chính của Gen D Arena 2026. Dự án cần chứng minh được vấn đề thực tiễn, xác định rõ nhóm đối tượng hưởng lợi, giá trị tạo ra và tính khả thi trong việc triển khai.",
      },
    ],
  },
  {
    id: "dang-ky",
    title: "4. ĐĂNG KÝ THAM GIA",
    icon: "📝",
    items: [
      {
        id: "4.1",
        question: "4.1. Làm thế nào để tôi có thể đăng ký tham gia cuộc thi?",
        answer:
          "Thí sinh truy cập portal đăng ký chính thức trên website của cuộc thi, điền đầy đủ thông tin thành viên và tải lên hồ sơ dự án theo hướng dẫn chi tiết của BTC.",
      },
      {
        id: "4.2",
        question:
          "4.2. Thời hạn mở và đóng cổng đăng ký tham gia cuộc thi là khi nào?",
        answer:
          "Cổng đăng ký trực tuyến sẽ mở chính thức từ ngày 01/09 và đóng đơn vào ngày 20/09. Thời gian gia hạn nộp hồ sơ (nếu có) kéo dài đến ngày 22/09.",
      },
      {
        id: "4.3",
        question:
          "4.3. Tôi có phải đóng lệ phí khi đăng ký tham gia cuộc thi không?",
        answer:
          "Cuộc thi hoàn toàn không thu bất kỳ khoản phí tham gia nào đối với tất cả các đội thi đăng ký.",
      },
      {
        id: "4.4",
        question:
          "4.4. Đội thi của tôi có được chỉnh sửa thông tin thành viên sau khi đã gửi biểu mẫu đăng ký không?",
        answer:
          "Các đội thi có thể chủ động cập nhật và chỉnh sửa thông tin thành viên trực tiếp trên hệ thống website chính thức trong suốt thời gian mở cổng đăng ký Vòng Sơ loại.",
      },
    ],
  },
  {
    id: "vong-thi",
    title: "5. VÒNG THI VÀ CHƯƠNG TRÌNH ĐÀO TẠO",
    icon: "🏆",
    items: [
      {
        id: "5.1",
        question:
          "5.1. Vòng Sơ loại của cuộc thi được tổ chức theo hình thức nào?",
        answer:
          "Tại Vòng Sơ loại, các đội thi nộp hồ sơ dự án theo mẫu quy định của BTC. Hội đồng Ban Giám khảo sẽ tiến hành thẩm định, phân loại theo lĩnh vực và chọn ra TOP 10 dự án xuất sắc nhất bước tiếp vào Vòng Hackathon.",
      },
      {
        id: "5.2",
        question:
          "5.2. Video giới thiệu dự án được sử dụng và đánh giá như thế nào?",
        answer:
          "Sau khi kết thúc Vòng Hackathon, TOP 10 dự án sẽ xây dựng video giới thiệu giải pháp và sản phẩm. Video này sẽ được đăng tải trên Fanpage chính thức của cuộc thi nhằm phục vụ hoạt động truyền thông và bình chọn cho hạng mục 'Giải Đội thi được yêu thích nhất'.",
      },
      {
        id: "5.3",
        question:
          "5.3. Vòng Chung kết của cuộc thi diễn ra theo cấu trúc và hình thức như thế nào?",
        answer:
          "TOP 5 dự án xuất sắc nhất tại Vòng Chung kết sẽ tham gia tranh tài qua các nội dung:\n- Triển lãm và giới thiệu giải pháp tại gian hàng dự án.\n- Pitching trực tiếp trước Hội đồng Ban Giám khảo với thời lượng 10 phút thuyết trình và 10 phút trả lời câu hỏi phản biện.",
      },
    ],
  },
  {
    id: "tieu-chi",
    title: "6. TIÊU CHÍ CHẤM ĐIỂM",
    icon: "📊",
    items: [
      {
        id: "6.1",
        question:
          "6.1. Các dự án dự thi được đánh giá dựa trên những tiêu chí nào?",
        answer:
          "Các dự án được chấm điểm theo bộ tiêu chí (Rubric) chi tiết do BTC công bố chính thức trên website và sổ tay cuộc thi. Thí sinh có thể tải về tài liệu hướng dẫn để xem chi tiết các tiêu chuẩn đánh giá.",
      },
    ],
  },
  {
    id: "giai-thuong",
    title: "7. GIẢI THƯỞNG VÀ QUYỀN LỢI",
    icon: "🥇",
    items: [
      {
        id: "7.1",
        question:
          "7.1. Cơ cấu giải thưởng và các quyền lợi dành cho đội thi đạt giải như thế nào?",
        answer:
          "Cơ cấu giải thưởng dự kiến bao gồm:\n- 01 Giải Quán quân: 10.000.000 VNĐ\n- 01 Giải Á quân: 8.000.000 VNĐ\n- 01 Giải Quý quân: 5.000.000 VNĐ\n- 02 Giải Khuyến khích: 1.000.000 VNĐ / giải\n\nHạng mục giải phụ & hỗ trợ:\n- 01 Giải Đội thi được yêu thích nhất (Video): 1.000.000 VNĐ\n- 01 Giải Gian hàng được yêu thích nhất: 1.000.000 VNĐ\n- Hỗ trợ gian hàng: Mỗi đội thi thuộc TOP 5 nhận được kinh phí hỗ trợ 500.000 VNĐ để chuẩn bị gian hàng tại Vòng Chung kết.\n\n*Lưu ý: Các giá trị trên đại diện cho giải thưởng tiền mặt. Các phần thưởng hiện vật hoặc gói hỗ trợ tăng tốc từ nhà tài trợ (nếu có) sẽ được BTC cập nhật tại thông báo chính thức.*",
      },
      {
        id: "7.2",
        question:
          "7.2. Đội thi đạt các giải thưởng chính có được phép nhận thêm các giải phụ không?",
        answer:
          "Có. Các đội thi đạt Giải chính (Quán quân, Á quân, Quý quân, Khuyến khích) hoàn toàn có thể đồng thời nhận thêm các Giải phụ nếu thỏa mãn điều kiện bình chọn của từng hạng mục.",
      },
    ],
  },
  {
    id: "so-huu-tri-tue",
    title: "8. QUYỀN SỞ HỮU TRÍ TUỆ",
    icon: "🛡️",
    items: [
      {
        id: "8.1",
        question:
          "8.1. Quy định về quyền sở hữu trí tuệ đối với các dự án tham gia cuộc thi như thế nào?",
        answer:
          "Các đội thi có trách nhiệm cam kết tính nguyên gốc của dự án và đảm bảo không vi phạm bản quyền hoặc quyền sở hữu trí tuệ của bất kỳ cá nhân hay tổ chức nào. Chi tiết về quyền sở hữu trí tuệ và quyền khai thác hình ảnh truyền thông sẽ được cụ thể hóa trong Quy chế chính thức của cuộc thi.",
      },
    ],
  },
  {
    id: "ho-tro",
    title: "9. HỖ TRỢ THÍ SINH",
    icon: "🤝",
    items: [
      {
        id: "9.1",
        question:
          "9.1. Các đội thi sẽ nhận được những hỗ trợ gì từ BTC trong suốt quá trình tham gia?",
        answer:
          "Trong Vòng Hackathon, BTC cung cấp các chính sách hỗ trợ thí sinh bao gồm:\n- Hỗ trợ chuyên môn: Mỗi đội thi được kết nối và tư vấn trực tiếp từ 01 đến 02 Mentor giàu kinh nghiệm.\n- Hỗ trợ hậu cần: BTC tài trợ chi phí ăn uống (bao gồm các bữa sáng, trưa và tối) trong 02 ngày diễn ra Vòng Hackathon, đồng thời bố trí khu vực teabreak phục vụ trong suốt thời gian diễn ra chương trình.",
      },
    ],
  },
]
