import Category from "./Category";
import Featured from "./Featured";
import HeroSection from "./HeroSection";
import Landing from "./Landing";
import RecentPosts from "./RecentPosts";
import Recommendation from "./Recommendation";
import AdContainer from "./AdContainer";

const Home = () => {
  return (
    <>
      <HeroSection />
      <RecentPosts />
      
      <div className="container mx-auto px-4 py-8">
        <AdContainer placement="banner" limit={1} />
      </div>
      
      <Landing />
      <Recommendation />
      <div className="container mx-auto px-4 py-8 ">
        <AdContainer placement="inline" limit={3} />
      </div>
      <Category />
      <Featured />
    </>
  );
};

export default Home;
