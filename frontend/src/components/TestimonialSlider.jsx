import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

const testimonials = [
  {
    name: "Kunal Sharma",
    role: "Reliable & Genuine Products",
    img: "https://randomuser.me/api/portraits/men/32.jpg",
    text: "I have been purchasing auto parts from Shop99 Auto Parts for years, and their quality has always been exceptional. Every component feels durable and genuine. Their strict quality checks truly reflect in the performance of the parts. Highly recommended!",
  },
  {
    name: "Vikram Singh",
    role: "Excellent Customer Service",
    img: "https://randomuser.me/api/portraits/men/41.jpg",
    text: "The team at Shop99 Auto Parts is knowledgeable and always ready to help. They guided me in selecting the perfect accessories for my car. Their professionalism and honesty make them stand out in the market.",
  },
  {
    name: "Anushka",
    role: "Wide Range of Products",
    img: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "What I love most about Shop99 is their huge variety of automotive components. Whether it’s basic maintenance parts or premium accessories, they have everything under one roof. Truly a one-stop destination for auto enthusiasts!",
  },
  {
    name: "Neha Sharma",
    role: "Customer",
    img: "https://randomuser.me/api/portraits/women/68.jpg",
    text: "I trust Shop99 Auto Parts because of their strong legacy and consistent service over the years. Their commitment to quality and customer satisfaction is clearly visible in every purchase",
  },
];

const TestimonialSlider = () => {
  return (
  <section className="bg-gray-100 py-20 px-5">
      <div className="max-w-7xl mx-auto">

        {/* Title */}
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-14">
          Love from Clients
        </h2>

        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={30}
          slidesPerView={3}
          loop
          speed={900}   
          grabCursor={true}
          autoplay={{
            delay: 2500,
            disableOnInteraction: false,
          }}
          pagination={{ clickable: true }}
          breakpoints={{
            0: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
        >
          {testimonials.map((item, index) => (
            <SwiperSlide key={index} className="h-auto">

              {/* CARD */}
              <div className="
                bg-white rounded-2xl shadow-md
                p-8
                h-full min-h-[320px]  
                flex flex-col justify-between
                transition hover:shadow-xl
              ">

                {/* Top Content */}
                <div>
                  <div className="text-orange-400 mb-4 text-lg">
                    ★ ★ ★ ★ ☆
                  </div>

                  <p className="text-gray-600 leading-relaxed">
                    “{item.text}”
                  </p>
                </div>

                {/* Bottom User */}
                <div className="flex items-center gap-4 mt-8">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  <div>
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-gray-500">{item.role}</p>
                  </div>
                </div>

              </div>

            </SwiperSlide>
          ))}
        </Swiper>

      </div>
    </section>
  );
};

export default TestimonialSlider;
