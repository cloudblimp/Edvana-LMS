import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../context/AppContext';
import SearchBar from '../../components/student/SearchBar';
import { useParams } from 'react-router-dom';
import CourseCard from '../../components/student/CourseCard';
import { assets } from '../../assets/assets';
import Footer from '../../components/student/Footer';

export const CoursesList = () => {
  const { navigate, allCourses } = useContext(AppContext);
  const { input } = useParams();
  const [filteredCourse, setFilteredCourse] = useState([]);

  useEffect(() => {
    if (allCourses && allCourses.length > 0) {
      const tempCourses = allCourses.slice();
      input
        ? setFilteredCourse(
          tempCourses.filter((item) =>
            item.courseTitle.toLowerCase().includes(input.toLowerCase())
          )
        )
        : setFilteredCourse(tempCourses);
    }
  }, [allCourses, input]);

  return (
    <>
    <div className="relative md:px-36 px-8 pt-20 text-left">
      <div className="flex md:flex-row flex-col gap-6 items-center justify-between w-full">
        <div>
          <h1 className="text-4xl font-semibold text-gray-800">Course list</h1>
          <p className="text-gray-500">
            <span
              className="text-blue-600 cursor-pointer"
              onClick={() => navigate('/')}
            >
              Home
            </span>{' '}
            / <span>Course List</span>
          </p>
        </div>
        <SearchBar data={input} />
      </div>

      {input && (
        <div className="mt-6 inline-flex items-center gap-3 px-3 py-1 border rounded-full bg-gray-100 text-gray-700">
          <p className="text-sm">{input}</p>
          <img
            src={assets.cross_icon}
            alt="clear filter"
            className="cursor-pointer w-4 h-4"
            onClick={() => navigate("/course-list")}
          />
        </div>

      )}



      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 my-16 gap-3 px-2 md:p-0">
        {filteredCourse.map((course, index) => (
          <CourseCard key={index} course={course} />
        ))}
      </div>
    </div>
    <Footer />
    </>
  );
};

export default CoursesList;
